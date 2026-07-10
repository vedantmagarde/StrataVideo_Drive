import File from '../models/File.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { uploadQueue, downloadQueue } from '../jobs/queues.js';
import fs from 'fs';
import { google } from 'googleapis';
import { getValidToken } from '../controllers/youtubeController.js';
import { activeJobs } from '../utils/activeJobs.js';

export const uploadFile = async (req, res) => {
    try {
        const { email } = req.user;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const user = await User.findOne({ email });

        const newFile = new File({
            ownerEmail: email,
            groupId: user.groupId || null,
            filename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            status: 'pending'
        });
        await newFile.save();
        console.log(`[FileController] File document created in DB: ${newFile._id}`);

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
            groupId: user.groupId
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
        const { type } = req.query;

        let query = { ownerEmail: email };

        if (type) {
            // Simplified filter based on mimeType prefix
            if (type === 'image') query.mimeType = /^image\//;
            else if (type === 'video') query.mimeType = /^video\//;
            else if (type === 'audio') query.mimeType = /^audio\//;
            else if (type === 'document') query.mimeType = /pdf|msword|officedocument|text/;
            else if (type === 'archive') query.mimeType = /zip|rar|tar|gz|7z/;
            else if (type === 'code') query.mimeType = /json|javascript|html|css|xml|yaml/;
            else query.mimeType = { $not: /image|video|audio|pdf|msword|officedocument|text|zip|rar|tar|gz|7z|json|javascript|html|css|xml|yaml/ };
        }

        const files = await File.find(query).sort({ uploadedAt: -1 });
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

        const files = await File.find({
            ownerEmail: email,
            filename: { $regex: q, $options: 'i' }
        }).sort({ uploadedAt: -1 });

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

        const file = await File.findOne({ _id: fileId, ownerEmail: email });
        if (!file) {
            return res.status(404).json({ error: "File not found or unauthorized" });
        }

        // Delete each YouTube video
        for (const chunk of file.chunks) {
            try {
                const token = await getValidToken(chunk.youtubeAccountEmail);
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({ access_token: token });

                const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
                await youtube.videos.delete({ id: chunk.videoId });
            } catch (err) {
                console.error(`Failed to delete YouTube video ${chunk.videoId}:`, err.message);
                // Continue trying to delete other chunks and the file document even if one fails
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

        const file = await File.findOne({ _id: fileId, ownerEmail: email });
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

        res.download(job.outputPath, filename, (err) => {
            if (err) {
                console.error("Error serving file:", err);
            }
            // Aggressively delete file immediately after transfer finishes (or fails)
            // to prevent free-tier cloud servers from running out of disk space.
            if (fs.existsSync(job.outputPath)) {
                fs.unlinkSync(job.outputPath);
            }
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
