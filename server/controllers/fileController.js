import File from '../models/File.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Folder from '../models/Folder.js';
import { uploadQueue, downloadQueue } from '../jobs/queues.js';
import fs from 'fs';
import { google } from 'googleapis';
import { getValidToken, getValidTokenById, getOAuth2Client, getAllAvailableAccounts } from '../controllers/youtubeController.js';
import { activeJobs } from '../utils/activeJobs.js';

export const uploadFile = async (req, res) => {
    try {
        const { email } = req.user;
        const file = req.file;
        const folderId = req.body.folderId || null;
        const uploadMethod = req.body.uploadMethod || 'encrypted';

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const user = await User.findOne({ email });

        try {
            const accounts = await getAllAvailableAccounts(user.groupId || email);
            if (accounts.length < 2) {
                return res.status(400).json({ error: "Automated Quota Balancing requires a minimum of 2 connected YouTube accounts. Please connect another account in the dashboard." });
            }
            if (accounts.length > 10) {
                return res.status(400).json({ error: "Maximum of 10 YouTube accounts supported for sharding." });
            }
        } catch (accErr) {
            return res.status(400).json({ error: accErr.message });
        }

        const newFile = new File({
            ownerEmail: email,
            groupId: user.groupId || null,
            folderId: folderId === 'null' ? null : folderId,
            filename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadMethod: uploadMethod,
            status: 'pending'
        });
        await newFile.save();
        console.log(`[FileController] File document created in DB: ${newFile._id}`);

        if (folderId && folderId !== 'null') {
            await Folder.findByIdAndUpdate(folderId, { updatedAt: new Date() });
        }

        const job = new Job({
            type: 'upload',
            ownerEmail: email,
            fileId: newFile._id,
            status: 'pending'
        });
        await job.save();
        console.log(`[FileController] Job document created in DB: ${job._id}`);

        await uploadQueue.add({
            fileId: newFile._id,
            jobId: job._id,
            ownerEmail: email,
            tempFilePath: file.path,
            groupId: user.groupId,
            uploadMethod: uploadMethod
        });
        console.log(`[FileController] Successfully pushed job ${job._id} to Bull uploadQueue`);

        res.status(202).json({ message: "Upload job queued", jobId: job._id, fileId: newFile._id });
    } catch (error) {
        console.error("[FileController Fatal Error] Error in uploadFile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const listFiles = async (req, res) => {
    try {
        const { email } = req.user;
        const { type, folderId, sort } = req.query;

        const user = await User.findOne({ email });
        let query = user.groupId 
            ? { groupId: user.groupId } 
            : { ownerEmail: email };

        if (type) {
            if (type === 'image') query.mimeType = /^image\//;
            else if (type === 'video') query.mimeType = /^video\//;
            else if (type === 'audio') query.mimeType = /^audio\//;
            else if (type === 'document') query.mimeType = /pdf|msword|officedocument|text/;
            else if (type === 'archive') query.mimeType = /zip|rar|tar|gz|7z/;
            else if (type === 'code') query.mimeType = /json|javascript|html|css|xml|yaml/;
            else query.mimeType = { $not: /image|video|audio|pdf|msword|officedocument|text|zip|rar|tar|gz|7z|json|javascript|html|css|xml|yaml/ };
        } else {
            // If no type filter, use folder hierarchy
            query.folderId = (folderId && folderId !== 'null') ? folderId : null;
        }

        let sortObj = { uploadedAt: -1 };
        if (sort === 'oldest') sortObj = { uploadedAt: 1 };
        else if (sort === 'name_asc') sortObj = { filename: 1 };
        else if (sort === 'name_desc') sortObj = { filename: -1 };

        const files = await File.find(query).sort(sortObj);
        res.status(200).json({ files });
    } catch (error) {
        console.error("Error in listFiles:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const searchFiles = async (req, res) => {
    try {
        const { email } = req.user;
        const { q } = req.query;

        if (!q) {
            return res.status(200).json({ files: [] });
        }

        const user = await User.findOne({ email });
        let query = user.groupId 
            ? { groupId: user.groupId, filename: { $regex: q, $options: 'i' } } 
            : { ownerEmail: email, filename: { $regex: q, $options: 'i' } };

        const files = await File.find(query).sort({ uploadedAt: -1 });

        res.status(200).json({ files });
    } catch (error) {
        console.error("Error in searchFiles:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteFile = async (req, res) => {
    try {
        const { email } = req.user;
        const { fileId } = req.params;

        const user = await User.findOne({ email });
        let query = user.groupId 
            ? { _id: fileId, groupId: user.groupId } 
            : { _id: fileId, ownerEmail: email };

        const file = await File.findOne(query);
        if (!file) {
            return res.status(404).json({ error: "File not found or unauthorized" });
        }

        if (file.uploadMethod === 'direct' && file.youtubeVideoId) {
            try {
                const query = file.groupId ? { groupId: file.groupId, 'youtube.connected': true } : { email: file.ownerEmail, 'youtube.connected': true };
                const members = await User.find(query);
                
                for (const member of members) {
                    try {
                        const token = await getValidToken(member.email);
                        const oauth2Client = getOAuth2Client();
                        oauth2Client.setCredentials({
                            access_token: token,
                            refresh_token: member.youtube.refreshToken
                        });
                        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
                        await youtube.videos.delete({ id: file.youtubeVideoId });
                        console.log(`[DeleteFile] Successfully deleted direct video ${file.youtubeVideoId} using account ${member.email}`);
                        break; // Stop after successful deletion
                    } catch (err) {
                        // Might fail if video isn't on this specific member's channel; keep trying
                    }
                }
            } catch (err) {
                console.error("Failed to delete direct YouTube video:", err.message);
            }
        } else {
            // Group chunks by account identifier (accountId or email)
            const groupedChunks = {};
            for (const chunk of file.chunks) {
                const identifier = chunk.accountId ? chunk.accountId.toString() : chunk.youtubeAccountEmail;
                if (!groupedChunks[identifier]) groupedChunks[identifier] = [];
                groupedChunks[identifier].push(chunk.videoId);
            }

            for (const identifier of Object.keys(groupedChunks)) {
                try {
                    let token, refreshToken;
                    if (identifier.includes('@')) {
                        token = await getValidToken(identifier);
                        const chunkUser = await User.findOne({ email: identifier });
                        refreshToken = chunkUser?.youtube?.refreshToken || '';
                    } else {
                        token = await getValidTokenById(identifier);
                        const chunkUser = await User.findById(identifier);
                        refreshToken = chunkUser?.youtube?.refreshToken || '';
                    }
                    
                    const oauth2Client = getOAuth2Client();
                    oauth2Client.setCredentials({ access_token: token, refresh_token: refreshToken });
                    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
                    
                    for (const videoId of groupedChunks[identifier]) {
                        try {
                            await youtube.videos.delete({ id: videoId });
                        } catch (err) {
                            console.error(`Failed to delete YouTube chunk ${videoId}:`, err.message);
                        }
                    }
                } catch (err) {
                    console.error(`Failed to authenticate YouTube client for account ${identifier}:`, err.message);
                }
            }
        }

        await File.deleteOne({ _id: fileId });

        res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("Error in deleteFile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const downloadFile = async (req, res) => {
    try {
        const { email } = req.user;
        const { fileId } = req.params;

        const user = await User.findOne({ email });
        let query = user.groupId 
            ? { _id: fileId, groupId: user.groupId } 
            : { _id: fileId, ownerEmail: email };

        const file = await File.findOne(query);
        if (!file) {
            return res.status(404).json({ error: "File not found or unauthorized" });
        }

        if (file.status !== 'ready') {
            return res.status(400).json({ error: "File is not ready for download" });
        }

        const job = new Job({
            type: 'download',
            ownerEmail: email,
            fileId: file._id,
            status: 'pending'
        });
        await job.save();

        await downloadQueue.add({
            fileId: file._id,
            jobId: job._id,
            ownerEmail: email
        });

        res.status(202).json({ message: "Download job queued", jobId: job._id });
    } catch (error) {
        console.error("Error in downloadFile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getJobStatus = async (req, res) => {
    try {
        const { email } = req.user;
        const { jobId } = req.params;

        const job = await Job.findOne({ _id: jobId, ownerEmail: email }).populate('fileId');
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        let response = { job };
        if (job.status === 'ready' && job.type === 'download') {
            response.downloadUrl = `/api/files/serve/${job._id}`;
            response.filename = job.fileId ? job.fileId.filename : 'downloaded_file';
        }

        res.status(200).json(response);
    } catch (error) {
        console.error("Error in getJobStatus:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const serveFile = async (req, res) => {
    try {
        const { email } = req.user;
        const { jobId } = req.params;

        const job = await Job.findOne({ _id: jobId, ownerEmail: email }).populate('fileId');
        if (!job || job.type !== 'download' || job.status !== 'ready' || !job.outputPath) {
            return res.status(404).json({ error: "File not ready or not found" });
        }

        if (!fs.existsSync(job.outputPath)) {
            return res.status(404).json({ error: "Temporary file expired or removed" });
        }

        const filename = job.fileId ? job.fileId.filename : 'download';

        const cleanup = () => {
            if (fs.existsSync(job.outputPath)) {
                try {
                    fs.unlinkSync(job.outputPath);
                    console.log(`[ServeFile] Failsafe cleanup executed for: ${job.outputPath}`);
                } catch (e) {
                    console.error(`[ServeFile] Failed to delete file:`, e);
                }
            }
        };

        res.download(job.outputPath, filename, (err) => {
            if (err) {
                console.error("Error serving file:", err);
            }
            cleanup();
        });

        res.on('close', () => {
            cleanup();
        });
    } catch (error) {
        console.error("Error in serveFile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const cancelJob = async (req, res) => {
    try {
        const { email } = req.user;
        const { jobId } = req.params;

        const job = await Job.findOneAndUpdate(
            { _id: jobId, ownerEmail: email, status: { $in: ['pending', 'processing'] } },
            { status: 'failed', error: 'Cancelled by user' },
            { new: true }
        );

        if (!job) {
            return res.status(404).json({ error: "Job not found or cannot be cancelled" });
        }

        if (activeJobs.has(jobId)) {
            console.log(`[CancelJob] Killing active process for job ${jobId}`);
            const processRef = activeJobs.get(jobId);
            if (processRef && typeof processRef.kill === 'function') {
                processRef.kill('SIGKILL');
            }
            activeJobs.delete(jobId);
        }

        res.status(200).json({ message: "Job cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling job:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
