import cron from 'node-cron';
import User from '../models/User.js';


cron.schedule('0 0 * * *', async () => {
    try {
        console.log("Running midnight YouTube quota reset job...");
        const result = await User.updateMany(
            { 'youtube.connected': true },
            { 
                $set: { 
                    'youtube.quotaUsed': 0,
                    'youtube.quotaResetAt': new Date(new Date().setHours(24, 0, 0, 0) + 24 * 60 * 60 * 1000) 
                } 
            }
        );
        console.log(`Reset quota for ${result.modifiedCount} users.`);
    } catch (error) {
        console.error("Error in quota reset job:", error);
    }
});
