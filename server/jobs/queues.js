import Bull from 'bull';
import dotenv from 'dotenv';
dotenv.config();

const redisConfig = {
    redis: {
        host: process.env.UPSTASH_REDIS_URL ? new URL(process.env.UPSTASH_REDIS_URL).hostname : '127.0.0.1',
        port: process.env.UPSTASH_REDIS_URL ? new URL(process.env.UPSTASH_REDIS_URL).port : 6379,
        password: process.env.UPSTASH_REDIS_URL ? new URL(process.env.UPSTASH_REDIS_URL).password : undefined,
        tls: process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_URL.includes('rediss') ? {} : undefined
    }
};

export const uploadQueue = new Bull('upload-queue', redisConfig);
export const downloadQueue = new Bull('download-queue', redisConfig);

// Debugging listeners for queue events
const setupQueueListeners = (queue, queueName) => {
    queue.on('error', (error) => {
        console.error(`[Bull Queue - ${queueName}] ERROR:`, error.message || error);
    });
    queue.on('waiting', (jobId) => {
        console.log(`[Bull Queue - ${queueName}] Job ${jobId} is waiting to be processed`);
    });
    queue.on('active', (job, jobPromise) => {
        console.log(`[Bull Queue - ${queueName}] Job ${job.id} has started processing`);
    });
    queue.on('failed', (job, err) => {
        console.error(`[Bull Queue - ${queueName}] Job ${job.id} failed with error:`, err.message);
    });
    queue.on('ready', () => {
        console.log(`[Bull Queue - ${queueName}] Successfully connected to Redis and ready to process jobs.`);
    });
};

setupQueueListeners(uploadQueue, 'uploadQueue');
setupQueueListeners(downloadQueue, 'downloadQueue');
