import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Job from './models/Job.js';
import File from './models/File.js';
import { decode, downloadVideo } from './utils/decoder.js';
import { reassembleChunks } from './utils/chunker.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Strata Desktop Sync Connected to Cloud Queue (MongoDB)'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

const downloadsDir = path.join(os.homedir(), 'Downloads', 'StrataVideo_Downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

console.log(`\n===========================================`);
console.log(`🚀 StrataVideo Desktop Sync Node Started`);
console.log(`📁 Downloads will be saved to:`);
console.log(`   ${downloadsDir}`);
console.log(`===========================================\n`);
console.log(`🔄 Polling for pending download jobs...\n`);

const processNextJob = async () => {
    let activeJobId = null;
    try {
        // Find and lock the next pending job atomically
        const job = await Job.findOneAndUpdate(
            { status: 'pending', type: 'download' },
            { status: 'processing', progress: 5 },
            { returnDocument: 'after' }
        );

        if (!job) {
            // No jobs, wait 5 seconds and poll again
            setTimeout(processNextJob, 5000);
            return;
        }

        activeJobId = job._id;

        console.log(`\n===========================================`);
        console.log(`📥 NEW DOWNLOAD JOB DETECTED: ${job._id}`);
        console.log(`===========================================`);

        const file = await File.findById(job.fileId);
        if (!file || file.status !== 'ready') {
            throw new Error("File not found or not ready in database");
        }

        let finalOutputPath;

        if (file.uploadMethod === 'direct') {
            console.log(`[StrataSync] Downloading direct streamable video ${file.youtubeVideoId}...`);
            const tempDir = './tmp';
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            await Job.findByIdAndUpdate(job._id, { progress: 50 });

            // Download using the local home IP!
            const downloadedPath = await downloadVideo(file.youtubeVideoId, job.ownerEmail, tempDir, job._id, true);
            
            const safeFilename = file.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            finalOutputPath = path.join(downloadsDir, safeFilename);
            fs.renameSync(downloadedPath, finalOutputPath);
            
            console.log(`[StrataSync] Direct download complete!`);
        } else {
            const totalChunks = file.chunks.length;
            const chunkBuffers = [];
            const tempDir = './tmp';
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            for (let i = 0; i < totalChunks; i++) {
                const chunk = file.chunks[i];

                const currentJobStatus = await Job.findById(job._id);
                if (currentJobStatus && currentJobStatus.status === 'failed') {
                    throw new Error("Job was cancelled by user");
                }

                console.log(`[StrataSync] Decoding chunk ${i + 1}/${totalChunks}...`);
                
                const onProgress = async (percent) => {
                    const chunkStartProg = 5 + Math.floor((i / totalChunks) * 85);
                    const chunkEndProg = 5 + Math.floor(((i + 1) / totalChunks) * 85);
                    const currentProg = chunkStartProg + Math.floor((percent / 100) * (chunkEndProg - chunkStartProg));
                    await Job.findByIdAndUpdate(job._id, { progress: currentProg });
                };

                const accountIdentifier = chunk.accountId ? chunk.accountId.toString() : chunk.youtubeAccountEmail;
                
                // Decode using the local home IP!
                const chunkBuf = await decode(chunk.videoId, accountIdentifier, job.ownerEmail, tempDir, job._id, onProgress);
                console.log(`[StrataSync] Successfully decoded chunk ${i + 1}/${totalChunks}`);

                chunkBuffers.push({ chunkIndex: chunk.chunkIndex, data: chunkBuf });

                const prog = 5 + Math.floor(((i + 1) / totalChunks) * 85);
                await Job.findByIdAndUpdate(job._id, { progress: prog });
            }

            console.log(`[StrataSync] Reassembling all chunks...`);
            const finalBuffer = reassembleChunks(chunkBuffers);
            
            const safeFilename = file.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            finalOutputPath = path.join(downloadsDir, safeFilename);
            fs.writeFileSync(finalOutputPath, finalBuffer);
        }

        console.log(`\n🎉 DOWNLOAD COMPLETE!`);
        console.log(`📁 File saved successfully to:`);
        console.log(`   ${finalOutputPath}\n`);

        await Job.findByIdAndUpdate(job._id, { status: 'ready', progress: 100, outputPath: finalOutputPath });

        // Loop immediately to catch any other pending jobs
        setTimeout(processNextJob, 1000);

    } catch (error) {
        console.error(`\n❌ [StrataSync Error]:`, error.message);
        
        if (activeJobId) {
            try {
                await Job.findByIdAndUpdate(activeJobId, { status: 'failed', error: error.message });
            } catch (e) {
                console.error(`Failed to update job status to failed:`, e);
            }
        }

        setTimeout(processNextJob, 5000);
    }
};

// Start the loop
processNextJob();
