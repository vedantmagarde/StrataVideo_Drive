import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { downloadQueue } from './queues.js';
import Job from '../models/Job.js';
import File from '../models/File.js';
import { decode } from '../utils/decoder.js';
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

        const totalChunks = file.chunks.length;
        const chunkBuffers = [];

        for (let i = 0; i < totalChunks; i++) {
            const chunk = file.chunks[i];

            // a. decode chunk
            const tempDir = './tmp';
            const chunkBuf = await decode(chunk.videoId, chunk.youtubeAccountEmail, ownerEmail, tempDir);

            // b. collect chunk buffer
            chunkBuffers.push({ chunkIndex: chunk.chunkIndex, data: chunkBuf });

            // c. update progress
            const prog = 5 + Math.floor(((i + 1) / totalChunks) * 85);
            bullJob.progress(prog);
            await Job.findByIdAndUpdate(jobId, { progress: prog });
        }

        // 4. reassembleChunks
        const finalBuffer = reassembleChunks(chunkBuffers);

        // 5. write final file to /tmp/uuid_filename
        const safeFilename = file.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        outputPath = path.join('./tmp', `${uuidv4()}_${safeFilename}`);
        fs.writeFileSync(outputPath, finalBuffer);

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
