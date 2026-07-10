import { Queue } from 'bullmq';
import { connection } from './config/connectDb.js';

const uploadQueue = new Queue('uploadQueue', { connection });
const downloadQueue = new Queue('downloadQueue', { connection });

async function clearQueues() {
    console.log("Wiping all old ghost jobs from Redis queues...");
    await uploadQueue.obliterate({ force: true });
    await downloadQueue.obliterate({ force: true });
    console.log("Successfully wiped all jobs!");
    process.exit(0);
}

clearQueues().catch(console.error);
