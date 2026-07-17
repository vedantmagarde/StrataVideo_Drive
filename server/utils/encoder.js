import { spawn } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { encrypt } from './encryption.js';
import ffmpegPath from 'ffmpeg-static';
import { activeJobs } from './activeJobs.js';



let RS;
try {
    RS = await import('@ronomon/reed-solomon');
} catch (e) {
    console.warn("Reed-Solomon not loaded (likely on Windows dev). It will mock RS in dev.");
}

const BLOCK_SIZE = 8;
const WIDTH = 1920;
const HEIGHT = 1080;
const BLOCKS_X = Math.floor(WIDTH / BLOCK_SIZE);
const BLOCKS_Y = Math.floor(HEIGHT / BLOCK_SIZE);
const BITS_PER_FRAME = BLOCKS_X * BLOCKS_Y;

export const applyReedSolomon = (buffer) => {
    if (!RS || !RS.default) {
        console.warn("Skipping RS encode (mocking)");
        return buffer;
    }


    const dataShards = 10;
    const parityShards = 2;
    const totalShards = dataShards + parityShards;

    const remainder = buffer.length % dataShards;
    let paddedBuffer = buffer;
    if (remainder !== 0) {
        const padding = Buffer.alloc(dataShards - remainder);
        paddedBuffer = Buffer.concat([buffer, padding]);
    }

    const shardLength = paddedBuffer.length / dataShards;
    const outBuffer = Buffer.alloc(totalShards * shardLength);
    paddedBuffer.copy(outBuffer);

    return new Promise((resolve, reject) => {
        RS.default.encode(
            outBuffer,
            0,
            outBuffer.length,
            shardLength,
            dataShards,
            parityShards,
            (error) => {
                if (error) return reject(error);
                resolve(outBuffer);
            }
        );
    });
};

export const bufferToBits = (buffer) => {
    const bits = new Uint8Array(buffer.length * 8);
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        for (let j = 0; j < 8; j++) {
            bits[i * 8 + j] = (byte >> (7 - j)) & 1;
        }
    }
    return bits;
};

export const renderFramesToVideo = (bits, outputPath, jobId, onProgress) => {
    return new Promise((resolve, reject) => {

        const ffmpeg = spawn(ffmpegPath, [
            '-y',
            '-f', 'rawvideo',
            '-vcodec', 'rawvideo',
            '-s', `${WIDTH}x${HEIGHT}`,
            '-pix_fmt', 'rgba',
            '-r', '60',
            '-i', '-',
            '-f', 'lavfi',
            '-i', 'anoisesrc=color=pink:a=0.02',
            '-map', '0:v',
            '-map', '1:a',
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'ultrafast',
            '-pix_fmt', 'yuv420p',
            '-shortest',
            outputPath
        ]);

        if (jobId) {
            activeJobs.set(jobId, ffmpeg);
        }

        ffmpeg.stderr.on('data', (data) => {
            console.error(`[Encoder FFmpeg Log]: ${data.toString()}`);
        });

        ffmpeg.stdin.on('error', (err) => {
            console.error('[Encoder] FFmpeg stdin error (likely disk full or process killed):', err.message);
        });

        ffmpeg.on('close', (code) => {
            if (jobId) activeJobs.delete(jobId);

            if (code === 0) {
                console.log(`[Encoder] FFmpeg completed successfully for ${outputPath}`);
                resolve(outputPath);
            } else {
                console.error(`[Encoder Error]: FFmpeg exited with code ${code}`);
                reject(new Error(`FFmpeg exited with code ${code}`));
            }
        });


        const numFrames = Math.ceil(bits.length / BITS_PER_FRAME);
        const rgbaSize = WIDTH * HEIGHT * 4;

        const writeFrames = () => {
            let i = 0;
            let bitOffset = 0;
            let lastReportedPercent = -1;
            let lastTerminalPercent = -1;

            const writeNext = () => {
                let ok = true;
                while (i < numFrames && ok) {
                    const frameBuffer = Buffer.alloc(rgbaSize);

                    for (let y = 0; y < BLOCKS_Y; y++) {
                        for (let x = 0; x < BLOCKS_X; x++) {
                            const bit = (bitOffset < bits.length) ? bits[bitOffset] : 0;
                            bitOffset++;

                            const r = bit === 1 ? 255 : 0;
                            const b = bit === 0 ? 255 : 0;

                            for (let by = 0; by < BLOCK_SIZE; by++) {
                                for (let bx = 0; bx < BLOCK_SIZE; bx++) {
                                    const py = y * BLOCK_SIZE + by;
                                    const px = x * BLOCK_SIZE + bx;
                                    const pIdx = (py * WIDTH + px) * 4;

                                    frameBuffer[pIdx] = r;
                                    frameBuffer[pIdx + 1] = 0;
                                    frameBuffer[pIdx + 2] = b;
                                    frameBuffer[pIdx + 3] = 255;
                                }
                            }
                        }
                    }
                    i++;

                    if (typeof onProgress === 'function') {
                        let percent = Math.floor((i / numFrames) * 100);

                        if (percent !== lastTerminalPercent && percent % 10 === 0) {
                            console.log(`[Encoder] Video rendering is ${percent}% complete...`);
                            lastTerminalPercent = percent;
                        }

                        if (percent !== lastReportedPercent && percent % 2 === 0) {
                            lastReportedPercent = percent;
                            onProgress(percent).catch(err => console.error("Progress update error:", err));
                        }
                    }

                    ok = ffmpeg.stdin.write(frameBuffer);
                }

                if (i < numFrames) {
                    ffmpeg.stdin.once('drain', writeNext);
                } else {
                    ffmpeg.stdin.end();
                }
            };
            writeNext();
        };

        writeFrames();
    });
};

export const encode = async (chunkBuffer, email, tempDir, jobId, onProgress) => {
    try {
        console.log(`[Encoder] Starting encode for user ${email}. Chunk size: ${chunkBuffer.length} bytes`);
        const encryptedBuffer = encrypt(chunkBuffer, email);
        console.log(`[Encoder] Encryption complete.`);

        const rsBuffer = await applyReedSolomon(encryptedBuffer);
        console.log(`[Encoder] Reed-Solomon applied.`);

        const bits = bufferToBits(rsBuffer);

        const outputPath = path.join(tempDir, `${uuidv4()}.mp4`);
        console.log(`[Encoder] Rendering frames to video at ${outputPath}...`);

        await renderFramesToVideo(bits, outputPath, jobId, onProgress);
        console.log(`[Encoder] Video rendering complete: ${outputPath}`);

        return outputPath;
    } catch (error) {
        console.error(`[Encoder Fatal Error]:`, error);
        throw error;
    }
};
