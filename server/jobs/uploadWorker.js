import fs from 'fs';
import path from 'path';
import { fileTypeFromFile } from 'file-type';
import { google } from 'googleapis';
import { uploadQueue } from './queues.js';
import Job from '../models/Job.js';
import File from '../models/File.js';
import { splitIntoChunks } from '../utils/chunker.js';
import { encode } from '../utils/encoder.js';
import { getAvailableAccount, getValidToken } from '../controllers/youtubeController.js';
import { sendUploadComplete, sendUploadFailed } from '../utils/mailer.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to upload MP4 to YouTube
const uploadToYouTube = async (videoPath, youtubeAccount) => {
    const token = await getValidToken(youtubeAccount.email);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const fakeTitles = ["family trip 2024", "birthday june", "vacation memories", "winter vlog", "summer compilation"];
    const title = fakeTitles[Math.floor(Math.random() * fakeTitles.length)];

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
    });

    return res.data.id;
};

uploadQueue.process(async (bullJob) => {
    const { fileId, jobId, ownerEmail, tempFilePath, groupId } = bullJob.data;

    try {
        await Job.findByIdAndUpdate(jobId, { status: 'processing', progress: 5 });

        // 2 & 3. Read temp file and detect mimeType
        const fileBuffer = fs.readFileSync(tempFilePath);
        const fileType = await fileTypeFromFile(tempFilePath);

        await File.findByIdAndUpdate(fileId, {
            status: 'processing',
            mimeType: fileType ? fileType.mime : 'application/octet-stream',
            extension: fileType ? fileType.ext : 'bin',
            sizeBytes: fileBuffer.length
        });

        bullJob.progress(10);
        await Job.findByIdAndUpdate(jobId, { progress: 10 });

        // 4. Split into chunks
        const chunks = splitIntoChunks(fileBuffer);
        const totalChunks = chunks.length;
        const uploadedChunksRecord = [];

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i];

            // a. get available account
            const ytAccount = await getAvailableAccount(groupId || ownerEmail); // fallback to owner if no group

            // b. encode chunk
            const tempDir = './tmp';
            const videoPath = await encode(chunk.data, ownerEmail, tempDir);

            // c & d. Random delay 2-5 min between uploads (skip for first chunk)
            if (i > 0) {
                const delayMs = Math.floor(Math.random() * (300000 - 120000 + 1) + 120000);
                console.log(`Delaying upload for ${delayMs}ms to avoid rate limits...`);
                await sleep(delayMs);
            }

            // e. upload MP4
            const videoId = await uploadToYouTube(videoPath, ytAccount);

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
