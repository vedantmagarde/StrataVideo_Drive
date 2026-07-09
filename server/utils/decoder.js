import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getValidToken } from '../controllers/youtubeController.js';
import { decrypt } from './encryption.js';

let RS;
try {
    RS = await import('@ronomon/reed-solomon');
} catch (e) {
    console.warn("Reed-Solomon not loaded in decoder.");
}

const BLOCK_SIZE = 16;
const WIDTH = 1280;
const HEIGHT = 720;
const BLOCKS_X = Math.floor(WIDTH / BLOCK_SIZE);
const BLOCKS_Y = Math.floor(HEIGHT / BLOCK_SIZE);
const BITS_PER_FRAME = BLOCKS_X * BLOCKS_Y;

export const downloadVideo = async (videoId, youtubeEmail, tempDir) => {
    const token = await getValidToken(youtubeEmail);
    const outputPath = path.join(tempDir, `${videoId}_dl.mp4`);

    return new Promise((resolve, reject) => {
        // Pass the token as a Bearer header to yt-dlp to download the unlisted video using the owner's account
        const cmd = `yt-dlp --add-header "Authorization: Bearer ${token}" -f bestvideo[ext=mp4] "https://www.youtube.com/watch?v=${videoId}" -o "${outputPath}"`;
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error("yt-dlp error:", stderr);
                return reject(error);
            }
            resolve(outputPath);
        });
    });
};

export const decodeFramesFromStream = (videoPath) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-f', 'rawvideo',
            '-pix_fmt', 'rgba',
            '-' // output to stdout
        ]);

        const allBits = [];
        let leftover = Buffer.alloc(0);
        const rgbaSize = WIDTH * HEIGHT * 4;

        ffmpeg.stdout.on('data', (chunk) => {
            let buffer = Buffer.concat([leftover, chunk]);

            while (buffer.length >= rgbaSize) {
                const frameBuffer = buffer.subarray(0, rgbaSize);
                buffer = buffer.subarray(rgbaSize);

                // Decode frame
                for (let y = 0; y < BLOCKS_Y; y++) {
                    for (let x = 0; x < BLOCKS_X; x++) {
                        // Sample center pixel of the 16x16 block
                        const center_y = y * BLOCK_SIZE + Math.floor(BLOCK_SIZE / 2);
                        const center_x = x * BLOCK_SIZE + Math.floor(BLOCK_SIZE / 2);
                        const pIdx = (center_y * WIDTH + center_x) * 4;

                        const r = frameBuffer[pIdx];
                        const bit = r > 128 ? 1 : 0;
                        allBits.push(bit);
                    }
                }
            }
            leftover = buffer;
        });

        ffmpeg.stderr.on('data', () => { /* ignore */ });

        ffmpeg.on('close', (code) => {
            if (code !== 0) reject(new Error(`FFmpeg exit code ${code}`));
            else resolve(allBits);
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

export const decode = async (videoId, youtubeEmail, ownerEmail, tempDir) => {
    // 1. download video
    const videoPath = await downloadVideo(videoId, youtubeEmail, tempDir);

    // 2. & 3. extract frames & convert frames to buffer via streaming
    const bits = await decodeFramesFromStream(videoPath);
    const rsBuffer = bitsToBuffer(bits);

    // 4. remove Reed-Solomon
    const encryptedBuffer = await removeReedSolomon(rsBuffer);

    // 5. decrypt using ownerEmail
    const decryptedBuffer = decrypt(encryptedBuffer, ownerEmail);

    // 6. delete temp video
    if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
    }

    // 7. return final decrypted Buffer
    return decryptedBuffer;
};
