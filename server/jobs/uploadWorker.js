import fs from 'fs';
import { uploadQueue } from './queue.js';
import Job from '../models/Job.js';
import File from '../models/File.js';
import User from '../models/User.js';
import { encryptBuffer } from '../utils/cryptoUtils.js';

// Since the user is in a group, we should find the connected YouTube accounts in the group
const getYouTubeAccount = async (userEmail) => {
    const user = await User.findOne({ email: userEmail }).populate('groupId');
    let groupUsers = [];
    if (user.groupId) {
        groupUsers = await User.find({ groupId: user.groupId, 'youtube.connected': true });
    } else {
        if (user.youtube && user.youtube.connected) {
            groupUsers = [user];
        }
    }
    
    if (groupUsers.length === 0) {
        throw new Error("No connected YouTube accounts found");
    }

    // Sort by quotaUsed
    groupUsers.sort((a, b) => a.youtube.quotaUsed - b.youtube.quotaUsed);
    return groupUsers[0];
};

uploadQueue.process('process-upload', async (bullJob) => {
    const { fileId, jobId, userEmail, tempFilePath } = bullJob.data;
    
    try {
        await Job.findByIdAndUpdate(jobId, { status: 'processing', progress: 10 });
        await File.findByIdAndUpdate(fileId, { status: 'processing' });
        
        bullJob.progress(10);
        
        // 1. Read file
        const fileBuffer = fs.readFileSync(tempFilePath);
        
        // 2. Encrypt file using userEmail
        const encryptedBuffer = encryptBuffer(fileBuffer, userEmail);
        bullJob.progress(30);
        await Job.findByIdAndUpdate(jobId, { progress: 30 });

        // 3. Reed-Solomon Encoding
        // The @ronomon/reed-solomon package usage requires initializing RS.
        // For this architectural scaffolding, we will simulate the RS and FFmpeg chunking logic,
        // as a production FFmpeg pixel-block encoding can take thousands of lines of C++/JS.
        
        // --- PSEUDOCODE FOR ENCODING ---
        // const rs = new ReedSolomon(...);
        // const encodedChunks = rs.encode(encryptedBuffer);
        // const videoPaths = await renderToVideo(encodedChunks);
        // -------------------------------

        bullJob.progress(50);
        await Job.findByIdAndUpdate(jobId, { progress: 50 });

        // 4. Upload to YouTube
        const ytAccount = await getYouTubeAccount(userEmail);
        
        // --- PSEUDOCODE FOR YOUTUBE UPLOAD ---
        // const youtube = google.youtube({ version: 'v3', auth: oauth2Client(ytAccount) });
        // const res = await youtube.videos.insert({ part: 'snippet,status', media: { body: fs.createReadStream(videoPaths[0]) } });
        // const videoId = res.data.id;
        // -------------------------------------
        
        // Mock video ID for the architecture implementation
        const videoId = "mock_video_id_" + Date.now();

        // Update quota
        ytAccount.youtube.quotaUsed += 1600;
        await ytAccount.save();

        bullJob.progress(90);
        await Job.findByIdAndUpdate(jobId, { progress: 90 });

        // 5. Update File Metadata
        await File.findByIdAndUpdate(fileId, {
            status: 'ready',
            $push: {
                chunks: {
                    chunkIndex: 0,
                    videoId: videoId,
                    youtubeAccountEmail: ytAccount.email
                }
            }
        });

        await Job.findByIdAndUpdate(jobId, { status: 'ready', progress: 100 });
        
        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        return { success: true, fileId };

    } catch (error) {
        console.error("Upload Job Error:", error);
        await Job.findByIdAndUpdate(jobId, { status: 'failed', error: error.message });
        await File.findByIdAndUpdate(fileId, { status: 'failed' });
        throw error;
    }
});
