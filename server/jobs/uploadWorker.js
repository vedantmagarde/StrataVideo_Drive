import fs from 'fs';
import path from 'path';
import { fileTypeFromFile } from 'file-type';
import { google } from 'googleapis';
import { uploadQueue } from './queues.js';
import Job from '../models/Job.js';
import File from '../models/File.js';
import { splitIntoChunks } from '../utils/chunker.js';
import { encode } from '../utils/encoder.js';
import { getAvailableAccount, getValidToken, getOAuth2Client } from '../controllers/youtubeController.js';
import { sendUploadComplete, sendUploadFailed } from '../utils/mailer.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
            const ytAccount = await getAvailableAccount(groupId || ownerEmail);
            
            const onUploadProgress = async (percent) => {
                const currentProg = 10 + Math.floor((percent / 100) * 90);
                bullJob.progress(currentProg);
                await Job.findByIdAndUpdate(jobId, { progress: currentProg });
            };

            const videoId = await uploadToYouTube(tempFilePath, ytAccount, onUploadProgress, fileDoc.filename);
            
            ytAccount.youtube.quotaUsed += 1600;
            await ytAccount.save();

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

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i];

            try {
                const currentJobStatus = await Job.findById(jobId);
                if (currentJobStatus && currentJobStatus.status === 'failed') {
                    throw new Error("Job was cancelled by user");
                }

                console.log(`[UploadWorker] Processing chunk ${i + 1}/${totalChunks} for fileId ${fileId}...`);
                // a. get available account
                const ytAccount = await getAvailableAccount(groupId || ownerEmail); // fallback to owner if no group
                console.log(`[UploadWorker] Selected YouTube account: ${ytAccount.email}`);

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

                // c & d. Random delay 2-5 min between uploads (skip for first chunk)
                if (i > 0) {
                    const delayMs = Math.floor(Math.random() * (300000 - 120000 + 1) + 120000);
                    console.log(`[UploadWorker] Delaying upload for ${delayMs}ms to avoid rate limits...`);
                    await sleep(delayMs);
                }

                // e. upload MP4
                console.log(`[UploadWorker] Uploading chunk to YouTube...`);
                
                const onUploadProgress = async (percent) => {
                    const currentProg = chunkStartProg + Math.floor(chunkTotalProg / 2) + Math.floor((percent / 100) * (chunkTotalProg / 2));
                    bullJob.progress(currentProg);
                    await Job.findByIdAndUpdate(jobId, { progress: currentProg });
                };

                const videoId = await uploadToYouTube(videoPath, ytAccount, onUploadProgress);
                console.log(`[UploadWorker] Upload successful. Video ID: ${videoId}`);

                // f. store record
                uploadedChunksRecord.push({
                    chunkIndex: chunk.chunkIndex,
                    videoId,
                    youtubeAccountEmail: ytAccount.email
                });

                // g. increment quota
                ytAccount.youtube.quotaUsed += 1600;
                await ytAccount.save();

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
