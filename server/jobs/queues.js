// Native MemoryQueue implementation (Replaces BullMQ/Redis)

class MemoryQueue {
    constructor(name) {
        this.name = name;
        this.jobs = [];
        this.isProcessing = false;
        this.processFn = null;
    }

    process(fn) {
        this.processFn = fn;
    }

    async add(data) {
        this.jobs.push(data);
        console.log(`[MemoryQueue - ${this.name}] Job added. Queue size: ${this.jobs.length}`);
        this.run();
    }

    async run() {
        if (this.isProcessing || this.jobs.length === 0 || !this.processFn) return;
        this.isProcessing = true;
        
        const data = this.jobs.shift();
        console.log(`[MemoryQueue - ${this.name}] Starting job processing...`);
        
        const bullJob = {
            data,
            progress: (val) => {
                // In a memory queue, progress is mostly tracked by MongoDB updates in the worker.
                // We keep this function so existing worker code doesn't crash.
            }
        };

        try {
            await this.processFn(bullJob);
            console.log(`[MemoryQueue - ${this.name}] Job completed successfully.`);
        } catch (e) {
            console.error(`[MemoryQueue - ${this.name}] Job failed:`, e);
        } finally {
            this.isProcessing = false;
            // Check for more jobs asynchronously
            setImmediate(() => this.run());
        }
    }
}

export const uploadQueue = new MemoryQueue('upload-queue');
export const downloadQueue = new MemoryQueue('download-queue');

// Debugging listeners for queue events
const setupQueueListeners = (queue, queueName) => {
    // MemoryQueue does not require error/ready listeners in the same way as Redis-based Bull queues
};

setupQueueListeners(uploadQueue, 'uploadQueue');
setupQueueListeners(downloadQueue, 'downloadQueue');
