import fs from 'fs';
import path from 'path';
import { fileTypeFromFile } from 'file-type';
import { google } from 'googleapis';
import { uploadQueue } from './queues.js';
import Job from '../models/Job.js';
import File from '../models/File.js';
import { splitIntoChunks } from '../utils/chunker.js';
import { encode } from '../utils/encoder.js';
import { getAvailableAccount, getAllAvailableAccounts, getValidToken, getOAuth2Client } from '../controllers/youtubeController.js';
import { sendUploadComplete, sendUploadFailed } from '../utils/mailer.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const lastUploadTimes = new Map();

const waitForRateLimit = async (identifier) => {
    const now = Date.now();
    const lastUpload = lastUploadTimes.get(identifier.toString()) || 0;
    const timeSinceLast = now - lastUpload;
    const minDelay = 120000; // 2 minutes

    if (lastUpload !== 0 && timeSinceLast < minDelay) {
        const delayNeeded = minDelay - timeSinceLast + Math.floor(Math.random() * 60000);
        console.log(`[UploadWorker] Global Rate Limiter: Delaying upload for ${delayNeeded}ms to avoid spam filters...`);
        await sleep(delayNeeded);
    }
    
    lastUploadTimes.set(identifier.toString(), Date.now());
};

const uploadToYouTube = async (videoPath, youtubeAccount, onProgress, titleOverride = null) => {
    try {
        const token = await getValidToken(youtubeAccount.email);
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ 
            access_token: token,
            refresh_token: youtubeAccount.youtube.refreshToken
        });

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        const fakeTitles = ["family trip 2024", "birthday june", "vacation memories", "winter vlog", "summer compilation"];
        let title = titleOverride || fakeTitles[Math.floor(Math.random() * fakeTitles.length)];
        
        // Aggressive sanitization: remove all non-ASCII characters, emojis, and angle brackets
        title = title.replace(/[^\x20-\x7E]/g, '');
        title = title.replace(/[<>]/g, '');
        title = title.trim();
        
        if (title.length > 95) {
            title = title.substring(0, 95);
        }
        
        if (!title) {
            title = 'Streamable Backup ' + Date.now();
        }
        
        const fileSize = fs.statSync(videoPath).size;
        let lastReported = -1;

        const res = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title,
                    description: 'Private backup chunk',
                },
                status: {
                    privacyStatus: 'unlisted', // ALWAYS UNLISTED
                }
            },
            media: {
                body: fs.createReadStream(videoPath)
            }
        }, {
            onUploadProgress: evt => {
                const progress = Math.floor((evt.bytesRead / fileSize) * 100);
                if (progress !== lastReported && progress % 10 === 0) {
                    console.log(`[UploadToYouTube] Uploading to YouTube... ${progress}%`);
                    lastReported = progress;
                }
                if (onProgress) onProgress(progress);
            }
        });

        return res.data.id;
    } catch (error) {
        console.error(`\n================= YOUTUBE API ERROR =================`);
        console.error(`[UploadToYouTube] Failed to upload ${videoPath}`);
        console.error(`[UploadToYouTube] Target Account: ${youtubeAccount.email}`);
        if (error.response && error.response.data) {
            console.error(`[UploadToYouTube] Google API Response Error:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`[UploadToYouTube] Exception Details:`, error);
        }
        console.error(`=====================================================\n`);
        throw error;
    }
};

uploadQueue.process(async (bullJob) => {
    const { fileId, jobId, ownerEmail, tempFilePath, groupId, uploadMethod } = bullJob.data;

    try {
        await Job.findByIdAndUpdate(jobId, { status: 'processing', progress: 5 });

        // 2 & 3. Read temp file and detect mimeType
        const fileBuffer = fs.readFileSync(tempFilePath);
        const fileType = await fileTypeFromFile(tempFilePath);

        const fileDoc = await File.findByIdAndUpdate(fileId, {
            status: 'processing',
            mimeType: fileType ? fileType.mime : 'application/octet-stream',
            extension: fileType ? fileType.ext : 'bin',
            sizeBytes: fileBuffer.length
        }, { new: false });

        bullJob.progress(10);
        await Job.findByIdAndUpdate(jobId, { progress: 10 });

        // DIRECT BRANCH
        if (uploadMethod === 'direct') {
            console.log(`[UploadWorker] Direct streamable upload requested for fileId ${fileId}`);
            const allAccounts = await getAllAvailableAccounts(groupId || ownerEmail);
            
            const onUploadProgress = async (percent) => {
                const currentProg = 10 + Math.floor((percent / 100) * 90);
                bullJob.progress(currentProg);
                await Job.findByIdAndUpdate(jobId, { progress: currentProg });
            };

            let uploaded = false;
            let videoId;
            let usedAccount;

            await waitForRateLimit(groupId || ownerEmail);

            for (let i = 0; i < allAccounts.length; i++) {
                const ytAccount = allAccounts[i];
                try {
                    console.log(`[UploadWorker] Attempting direct upload to account: ${ytAccount.email}`);
                    videoId = await uploadToYouTube(tempFilePath, ytAccount, onUploadProgress, fileDoc.filename);
                    uploaded = true;
                    usedAccount = ytAccount;
                    break; // Success, exit retry loop
                } catch (err) {
                    console.error(`[UploadWorker] Direct upload to ${ytAccount.email} failed. Trying next account if available...`);
                    if (err.message && err.message.includes('exceeded')) {
                        console.log(`[UploadWorker] Flagging account ${ytAccount.email} as uploadLimitReached.`);
                        ytAccount.youtube.uploadLimitReached = true;
                        await ytAccount.save();
                    }
                }
            }

            if (!uploaded) {
                throw new Error("All connected accounts failed to upload. YouTube limits reached across the entire group.");
            }
            
            usedAccount.youtube.quotaUsed += 1600;
            await usedAccount.save();

            const finalFile = await File.findByIdAndUpdate(fileId, {
                status: 'ready',
                youtubeVideoId: videoId,
                chunks: []
            }, { new: true });

            await Job.findByIdAndUpdate(jobId, { status: 'ready', progress: 100 });
            await sendUploadComplete(ownerEmail, finalFile.filename);
            
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            return { success: true, fileId };
        }

        // 4. Split into chunks
        const chunks = splitIntoChunks(fileBuffer);
        const totalChunks = chunks.length;
        const uploadedChunksRecord = [];

        // Fetch all connected accounts for Round-Robin sharding
        const connectedAccounts = await getAllAvailableAccounts(groupId || ownerEmail);
        console.log(`[UploadWorker] Found ${connectedAccounts.length} accounts for sharding.`);

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i];

            try {
                const currentJobStatus = await Job.findById(jobId);
                if (currentJobStatus && currentJobStatus.status === 'failed') {
                    throw new Error("Job was cancelled by user");
                }

                console.log(`[UploadWorker] Processing chunk ${i + 1}/${totalChunks} for fileId ${fileId}...`);

                // b. encode chunk
                const tempDir = './tmp';
                
                const chunkStartProg = 10 + Math.floor((i / totalChunks) * 80);
                const chunkEndProg = 10 + Math.floor(((i + 1) / totalChunks) * 80);
                const chunkTotalProg = chunkEndProg - chunkStartProg;
                
                const onEncodeProgress = async (percent) => {
                    const currentProg = chunkStartProg + Math.floor((percent / 100) * (chunkTotalProg / 2));
                    bullJob.progress(currentProg);
                    await Job.findByIdAndUpdate(jobId, { progress: currentProg });
                };

                const videoPath = await encode(chunk.data, ownerEmail, tempDir, jobId, onEncodeProgress);

                // c & d. Wait for global rate limit before uploading
                await waitForRateLimit(groupId || ownerEmail);

                // e. upload MP4 with FAILOVER
                let uploaded = false;
                let attempts = 0;
                
                const onUploadProgress = async (percent) => {
                    const currentProg = chunkStartProg + Math.floor(chunkTotalProg / 2) + Math.floor((percent / 100) * (chunkTotalProg / 2));
                    bullJob.progress(currentProg);
                    await Job.findByIdAndUpdate(jobId, { progress: currentProg });
                };

                while (!uploaded && attempts < connectedAccounts.length) {
                    const accountIndex = (i + attempts) % connectedAccounts.length;
                    const ytAccount = connectedAccounts[accountIndex];
                    
                    if (ytAccount.youtube.uploadLimitReached) {
                        console.log(`[UploadWorker] Skipping account ${ytAccount.email} as it was flagged earlier in this job.`);
                        attempts++;
                        continue;
                    }

                    console.log(`[UploadWorker] Attempting chunk upload to YouTube account: ${ytAccount.email}`);
                    
                    try {
                        const videoId = await uploadToYouTube(videoPath, ytAccount, onUploadProgress);
                        console.log(`[UploadWorker] Upload successful. Video ID: ${videoId}`);
                        uploaded = true;

                        // f. store record
                        uploadedChunksRecord.push({
                            chunkIndex: chunk.chunkIndex,
                            videoId,
                            youtubeAccountEmail: ytAccount.email,
                            accountId: ytAccount._id
                        });

                        // g. increment quota
                        ytAccount.youtube.quotaUsed += 1600;
                        await ytAccount.save();
                    } catch (err) {
                        console.error(`[UploadWorker] Chunk upload failed on ${ytAccount.email}. Trying next account...`);
                        if (err.message && err.message.includes('exceeded')) {
                            console.log(`[UploadWorker] Flagging account ${ytAccount.email} as uploadLimitReached.`);
                            ytAccount.youtube.uploadLimitReached = true;
                            await ytAccount.save();
                        }
                        attempts++;
                    }
                }

                if (!uploaded) {
                    fs.unlinkSync(videoPath);
                    throw new Error("All connected accounts failed to upload this chunk. YouTube limits reached across the entire group.");
                }

                // h. delete temp video
                fs.unlinkSync(videoPath);

                const prog = 10 + Math.floor(((i + 1) / totalChunks) * 80);
                bullJob.progress(prog);
                await Job.findByIdAndUpdate(jobId, { progress: prog });
            } catch (chunkError) {
                console.error(`[UploadWorker] ERROR processing chunk ${i + 1}/${totalChunks}:`, chunkError);
                throw chunkError;
            }
        }

        // 6. Save records
        const finalFile = await File.findByIdAndUpdate(fileId, {
            status: 'ready',
            chunks: uploadedChunksRecord
        }, { new: true });

        // 8. Update job
        await Job.findByIdAndUpdate(jobId, { status: 'ready', progress: 100 });

        // 9. Send email
        await sendUploadComplete(ownerEmail, finalFile.filename);

        // 10. Clean up original temp file
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        return { success: true, fileId };
    } catch (error) {
        console.error("Upload Job Error:", error);
        await Job.findByIdAndUpdate(jobId, { status: 'failed', error: error.message });
        await File.findByIdAndUpdate(fileId, { status: 'failed' });
        await sendUploadFailed(ownerEmail, "Unknown File", error.message);

        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        throw error;
    }
});
