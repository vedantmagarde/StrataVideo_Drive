import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getValidToken } from '../controllers/youtubeController.js';
import { decrypt } from './encryption.js';
import ffmpegPath from 'ffmpeg-static';
import youtubedl from 'youtube-dl-exec';
import { activeJobs } from './activeJobs.js';

let RS;
try {
    RS = await import('@ronomon/reed-solomon');
} catch (e) {
    console.warn("Reed-Solomon not loaded in decoder.");
}

const BLOCK_SIZE = 8;
const WIDTH = 1920;
const HEIGHT = 1080;
const BLOCKS_X = Math.floor(WIDTH / BLOCK_SIZE);
const BLOCKS_Y = Math.floor(HEIGHT / BLOCK_SIZE);
const BITS_PER_FRAME = BLOCKS_X * BLOCKS_Y;

export const downloadVideo = async (videoId, youtubeEmail, tempDir, jobId, needsAudio = false) => {
    const outputPath = path.join(tempDir, `${videoId}_dl.mp4`);

    if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (e) { }
    }

    return new Promise((resolve, reject) => {
        const formatStr = needsAudio ? 'best[ext=mp4]/best' : 'bestvideo[ext=mp4]';
        const ytdlProcess = youtubedl.exec(`https://www.youtube.com/watch?v=${videoId}`, {
            f: formatStr,
            o: outputPath
        });

        ytdlProcess.catch(() => {
            // execa/tinyspawn returns a Promise that rejects on non-zero exit.
            // We ignore it here because we handle the 'close' event manually below.
        });

        if (jobId) {
            activeJobs.set(jobId, ytdlProcess);
        }

        ytdlProcess.on('close', (code) => {
            if (jobId) activeJobs.delete(jobId);
            if (code !== 0) {
                console.error("yt-dlp error, exit code:", code);
                reject(new Error("yt-dlp failed"));
            } else {
                resolve(outputPath);
            }
        });

        ytdlProcess.on('error', (err) => {
            if (jobId) activeJobs.delete(jobId);
            console.error("yt-dlp execution error:", err);
            reject(err);
        });
    });
};

export const decodeFramesFromStream = (videoPath, jobId, onProgress) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath, [
            '-i', videoPath,
            '-f', 'rawvideo',
            '-pix_fmt', 'rgba',
            '-' // output to stdout
        ]);

        if (jobId) {
            activeJobs.set(jobId, ffmpeg);
        }

        const allBits = [];
        const chunks = [];
        let accumulatedLength = 0;
        const rgbaSize = WIDTH * HEIGHT * 4;

        ffmpeg.stdout.on('data', (chunk) => {
            chunks.push(chunk);
            accumulatedLength += chunk.length;

            while (accumulatedLength >= rgbaSize) {
                let buffer = Buffer.concat(chunks);
                const frameBuffer = buffer.subarray(0, rgbaSize);
                const remainder = buffer.subarray(rgbaSize);

                chunks.length = 0;
                if (remainder.length > 0) {
                    chunks.push(remainder);
                    accumulatedLength = remainder.length;
                } else {
                    accumulatedLength = 0;
                }

                const frameData = new Uint8Array(BITS_PER_FRAME);
                let bitIdx = 0;
                for (let y = 0; y < BLOCKS_Y; y++) {
                    for (let x = 0; x < BLOCKS_X; x++) {
                        const center_y = y * BLOCK_SIZE + Math.floor(BLOCK_SIZE / 2);
                        const center_x = x * BLOCK_SIZE + Math.floor(BLOCK_SIZE / 2);
                        const pIdx = (center_y * WIDTH + center_x) * 4;
                        frameData[bitIdx++] = frameBuffer[pIdx] > 128 ? 1 : 0;
                    }
                }
                allBits.push(frameData);
            }
        });

        let totalDurationSec = 0;
        let lastReportedPercent = -1;
        let lastTerminalPercent = -1;

        ffmpeg.stderr.on('data', (data) => {
            const str = data.toString();

            const durationMatch = str.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (durationMatch) {
                const hours = parseInt(durationMatch[1], 10);
                const mins = parseInt(durationMatch[2], 10);
                const secs = parseFloat(durationMatch[3]);
                totalDurationSec = hours * 3600 + mins * 60 + secs;
            }

            const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (timeMatch && totalDurationSec > 0 && typeof onProgress === 'function') {
                const hours = parseInt(timeMatch[1], 10);
                const mins = parseInt(timeMatch[2], 10);
                const secs = parseFloat(timeMatch[3]);
                const currentTimeSec = hours * 3600 + mins * 60 + secs;

                let percent = Math.floor((currentTimeSec / totalDurationSec) * 100);
                if (percent > 100) percent = 100;

                if (percent !== lastTerminalPercent && percent % 10 === 0) {
                    console.log(`[Decoder] Video decoding is ${percent}% complete...`);
                    lastTerminalPercent = percent;
                }

                if (percent !== lastReportedPercent && percent % 2 === 0) {
                    lastReportedPercent = percent;
                    onProgress(percent).catch(err => console.error("Progress update error:", err));
                }
            }
        });

        ffmpeg.on('close', (code) => {
            if (jobId) activeJobs.delete(jobId);

            if (code !== 0) {
                console.error(`[Decoder Error]: FFmpeg exited with code ${code}`);
                reject(new Error(`FFmpeg exit code ${code}`));
            } else {
                console.log(`[Decoder] FFmpeg completed successfully`);
                const totalBits = allBits.reduce((acc, curr) => acc + curr.length, 0);
                const finalBits = new Uint8Array(totalBits);
                let offset = 0;
                for (let arr of allBits) {
                    finalBits.set(arr, offset);
                    offset += arr.length;
                }
                resolve(finalBits);
            }
        });
    });
};

export const bitsToBuffer = (bits) => {
    const numBytes = Math.floor(bits.length / 8);
    const buffer = Buffer.alloc(numBytes);
    for (let i = 0; i < numBytes; i++) {
        let byte = 0;
        for (let j = 0; j < 8; j++) {
            byte |= (bits[i * 8 + j] << (7 - j));
        }
        buffer[i] = byte;
    }
    return buffer;
};

export const removeReedSolomon = (buffer) => {
    if (!RS || !RS.default) return buffer; // Mock behavior

    return new Promise((resolve, reject) => {
        const dataShards = 10;
        const parityShards = 2;
        const totalShards = dataShards + parityShards;
        const shardLength = buffer.length / totalShards;

        // In a real implementation, we would pass an array of shard targets and which ones are available
        // For simplicity of this architecture spec without full RS binary testing, we pass the buffer.

        // This is a rough outline of the @ronomon/reed-solomon decode process
        const targets = 0; // bitmask of missing shards

        RS.default.decode(
            buffer,
            0,
            buffer.length,
            shardLength,
            dataShards,
            parityShards,
            targets,
            (error) => {
                if (error) return reject(error);
                // Extract only the data shards
                const dataBuffer = buffer.subarray(0, shardLength * dataShards);

                // Remove padding if any (would need to track original size)
                resolve(dataBuffer);
            }
        );
    });
};

export const decode = async (videoId, youtubeEmail, ownerEmail, tempDir, jobId, onProgress) => {
    try {
        console.log(`[Decoder] Starting decode for video ${videoId}...`);

        // 1. download video
        console.log(`[Decoder] Downloading video from YouTube...`);
        const videoPath = await downloadVideo(videoId, youtubeEmail, tempDir, jobId);
        console.log(`[Decoder] Download complete: ${videoPath}`);

        // 2. & 3. extract frames & convert frames to buffer via streaming
        console.log(`[Decoder] Extracting frames...`);
        const bits = await decodeFramesFromStream(videoPath, jobId, onProgress);
        const rsBuffer = bitsToBuffer(bits);
        console.log(`[Decoder] Frame extraction complete.`);

        // 4. remove Reed-Solomon
        console.log(`[Decoder] Removing Reed-Solomon...`);
        let encryptedBuffer = await removeReedSolomon(rsBuffer);

        // 5. decrypt using ownerEmail
        console.log(`[Decoder] Decrypting buffer...`);

        let lastNonZero = encryptedBuffer.length - 1;
        while (lastNonZero >= 0 && encryptedBuffer[lastNonZero] === 0) {
            lastNonZero--;
        }
        let estimatedLength = lastNonZero + 1;
        if (estimatedLength % 16 !== 0) {
            estimatedLength += 16 - (estimatedLength % 16);
        }

        let decryptedBuffer = null;
        let lastError = null;
        for (let l = estimatedLength; l <= encryptedBuffer.length; l += 16) {
            try {
                decryptedBuffer = decrypt(encryptedBuffer.subarray(0, l), ownerEmail);
                break;
            } catch (e) {
                lastError = e;
            }
        }

        if (!decryptedBuffer) {
            throw lastError || new Error("Failed to decrypt buffer: no valid padding found.");
        }

        // 6. delete temp video
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }

        console.log(`[Decoder] Decode process successful.`);
        // 7. return final decrypted Buffer
        return decryptedBuffer;
    } catch (error) {
        console.error(`[Decoder Fatal Error]:`, error);
        throw error;
    }
};
