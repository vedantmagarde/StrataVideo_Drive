import File from '../models/File.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { uploadQueue, downloadQueue } from '../jobs/queue.js';

export const uploadFile = async (req, res) => {
    try {
        const { userEmail } = req;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const user = await User.findOne({ email: userEmail });

        const newFile = new File({
            ownerEmail: userEmail,
            groupId: user.groupId || null,
            filename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            status: 'pending'
        });
        await newFile.save();

        const job = new Job({
            type: 'upload',
            ownerEmail: userEmail,
            fileId: newFile._id,
            status: 'pending'
        });
        await job.save();

        // Add to bull queue
        await uploadQueue.add('process-upload', {
            fileId: newFile._id,
            jobId: job._id,
            userEmail,
            tempFilePath: file.path
        });

        res.status(202).json({ message: "Upload job queued", jobId: job._id, fileId: newFile._id });
    } catch (error) {
        console.error("Error in uploadFile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const listFiles = async (req, res) => {
    try {
        const { userEmail } = req;
        const user = await User.findOne({ email: userEmail });
        
        let query = { ownerEmail: userEmail };
        
        // If in group, can they see group files? The spec says:
        // "Files are private per member (encrypted with their own email-derived key)"
        // "Even group members cannot decrypt each other's files"
        // Wait, does "shared dashboard" mean they see the files but can't download them, or they only see their own files?
        // Let's assume they only see their own files, but they share the quota.
        // Actually, if it's a shared dashboard, maybe they see all files in the group?
        // Let's fetch files for the user. If they want group files, we could add a query param. For now, just user's files.

        const files = await File.find(query).sort({ uploadedAt: -1 });
        res.status(200).json({ files });
    } catch (error) {
        console.error("Error in listFiles:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteFile = async (req, res) => {
    try {
        const { userEmail } = req;
        const { fileId } = req.params;

        const file = await File.findOne({ _id: fileId, ownerEmail: userEmail });
        if (!file) {
            return res.status(404).json({ error: "File not found or unauthorized" });
        }

        // Ideally we should also delete the videos from YouTube here
        // We can add a cleanup job to the queue
        
        await File.deleteOne({ _id: fileId });

        res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("Error in deleteFile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const downloadFile = async (req, res) => {
    try {
        const { userEmail } = req;
        const { fileId } = req.params;

        const file = await File.findOne({ _id: fileId, ownerEmail: userEmail });
        if (!file) {
            return res.status(404).json({ error: "File not found or unauthorized" });
        }

        if (file.status !== 'ready') {
            return res.status(400).json({ error: "File is not ready for download" });
        }

        const job = new Job({
            type: 'download',
            ownerEmail: userEmail,
            fileId: file._id,
            status: 'pending'
        });
        await job.save();

        await downloadQueue.add('process-download', {
            fileId: file._id,
            jobId: job._id,
            userEmail
        });

        res.status(202).json({ message: "Download job queued", jobId: job._id });
    } catch (error) {
        console.error("Error in downloadFile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getJobStatus = async (req, res) => {
    try {
        const { userEmail } = req;
        const { jobId } = req.params;

        const job = await Job.findOne({ _id: jobId, ownerEmail: userEmail });
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.status(200).json({ job });
    } catch (error) {
        console.error("Error in getJobStatus:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
