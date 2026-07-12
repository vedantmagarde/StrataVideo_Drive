import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { downloadQueue } from './queues.js';
import Job from '../models/Job.js';
import File from '../models/File.js';
import { decode, downloadVideo } from '../utils/decoder.js';
import { reassembleChunks } from '../utils/chunker.js';
// We will create mailer.js in Phase 8
import { sendDownloadReady } from '../utils/mailer.js';

downloadQueue.process(async (bullJob) => {
    const { fileId, jobId, ownerEmail } = bullJob.data;

    let outputPath;

    try {
        await Job.findByIdAndUpdate(jobId, { status: 'processing', progress: 5 });

        const file = await File.findById(fileId);

        if (!file || file.status !== 'ready') {
            throw new Error("File not ready");
        }

        if (file.uploadMethod === 'direct') {
            console.log(`[DownloadWorker] Downloading direct streamable video ${file.youtubeVideoId}...`);
            const tempDir = './tmp';
            
            bullJob.progress(50);
            await Job.findByIdAndUpdate(jobId, { progress: 50 });

            const downloadedPath = await downloadVideo(file.youtubeVideoId, ownerEmail, tempDir, jobId, true);
            
            const safeFilename = file.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            outputPath = path.join('./tmp', `${uuidv4()}_${safeFilename}`);
            fs.renameSync(downloadedPath, outputPath);
            
            console.log(`[DownloadWorker] Direct download complete: ${outputPath}`);
        } else {
            const totalChunks = file.chunks.length;
            const chunkBuffers = [];

            for (let i = 0; i < totalChunks; i++) {
                const chunk = file.chunks[i];

                try {
                    const currentJobStatus = await Job.findById(jobId);
                    if (currentJobStatus && currentJobStatus.status === 'failed') {
                        throw new Error("Job was cancelled by user");
                    }

                    console.log(`[DownloadWorker] Processing chunk ${i + 1}/${totalChunks} for fileId ${fileId}...`);
                    // a. decode chunk
                    const tempDir = './tmp';
                    console.log(`[DownloadWorker] Decoding videoId ${chunk.videoId} using account ${chunk.youtubeAccountEmail}...`);
                    
                    const onProgress = async (percent) => {
                        const chunkStartProg = 5 + Math.floor((i / totalChunks) * 85);
                        const chunkEndProg = 5 + Math.floor(((i + 1) / totalChunks) * 85);
                        const currentProg = chunkStartProg + Math.floor((percent / 100) * (chunkEndProg - chunkStartProg));
                        bullJob.progress(currentProg);
                        await Job.findByIdAndUpdate(jobId, { progress: currentProg });
                    };

                    const accountIdentifier = chunk.accountId ? chunk.accountId.toString() : chunk.youtubeAccountEmail;
                    const chunkBuf = await decode(chunk.videoId, accountIdentifier, ownerEmail, tempDir, jobId, onProgress);
                    console.log(`[DownloadWorker] Successfully decoded chunk ${i + 1}/${totalChunks}`);

                    // b. collect chunk buffer
                    chunkBuffers.push({ chunkIndex: chunk.chunkIndex, data: chunkBuf });

                    // c. update progress
                    const prog = 5 + Math.floor(((i + 1) / totalChunks) * 85);
                    bullJob.progress(prog);
                    await Job.findByIdAndUpdate(jobId, { progress: prog });
                } catch (chunkError) {
                    console.error(`[DownloadWorker] ERROR processing chunk ${i + 1}/${totalChunks}:`, chunkError);
                    throw chunkError;
                }
            }

            // 4. reassembleChunks
            const finalBuffer = reassembleChunks(chunkBuffers);
            console.log(`[DownloadWorker] All chunks successfully decoded and reassembled. Total size: ${finalBuffer.length} bytes`);

            // 5. write final file to /tmp/uuid_filename
            const safeFilename = file.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            outputPath = path.join('./tmp', `${uuidv4()}_${safeFilename}`);
            fs.writeFileSync(outputPath, finalBuffer);
            console.log(`[DownloadWorker] Final file successfully written to temporary path: ${path.resolve(outputPath)}`);
        }

        // 6. Set Job status -> ready with outputPath
        await Job.findByIdAndUpdate(jobId, { status: 'ready', progress: 100, outputPath });

        // 7. sendDownloadReady email
        await sendDownloadReady(ownerEmail, file.filename);

        // 8. auto-delete temp file after 10 minutes
        setTimeout(() => {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
                console.log(`Auto-deleted downloaded file: ${outputPath}`);
            }
        }, 10 * 60 * 1000);

        return { success: true, fileId, outputPath };

    } catch (error) {
        console.error("Download Job Error:", error);
        await Job.findByIdAndUpdate(jobId, { status: 'failed', error: error.message });

        if (outputPath && fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        throw error;
    }
});
