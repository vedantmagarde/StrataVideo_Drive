import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

const tmpDir = './tmp';

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
    try {
        if (!fs.existsSync(tmpDir)) return;

        const files = fs.readdirSync(tmpDir);
        const now = Date.now();
        const maxAgeMs = 5 * 60 * 1000; // 5 minutes

        let deletedCount = 0;

        files.forEach(file => {
            const filePath = path.join(tmpDir, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtimeMs > maxAgeMs) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`[TmpCleanup] Failsafe: Deleted old orphaned file ${file}`);
                    deletedCount++;
                } catch (err) {
                    console.error(`[TmpCleanup] Error deleting file ${file}:`, err);
                }
            }
        });

        if (deletedCount > 0) {
            console.log(`[TmpCleanup] Failsafe cleanup finished. Removed ${deletedCount} orphaned files.`);
        }
    } catch (error) {
        console.error("[TmpCleanup] Error during cleanup job:", error);
    }
});
