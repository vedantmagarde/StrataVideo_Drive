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
