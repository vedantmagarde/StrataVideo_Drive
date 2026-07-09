import Bull from 'bull';
import dotenv from 'dotenv';
dotenv.config();

const redisConfig = {
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    }
};

export const uploadQueue = new Bull('upload-queue', redisConfig);
export const downloadQueue = new Bull('download-queue', redisConfig);


