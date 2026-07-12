import Folder from '../models/Folder.js';
import File from '../models/File.js';
import User from '../models/User.js';
import { google } from 'googleapis';
import { getValidToken, getOAuth2Client } from '../controllers/youtubeController.js';

export const createFolder = async (req, res) => {
    try {
        const { email } = req.user;
        const { name, parentFolderId } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Folder name is required" });
        }

        const user = await User.findOne({ email });

        const newFolder = new Folder({
            name,
            ownerEmail: email,
            groupId: user.groupId || null,
            parentFolderId: parentFolderId || null
        });

        await newFolder.save();
        res.status(201).json({ folder: newFolder });
    } catch (error) {
        console.error("Error creating folder:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getFolders = async (req, res) => {
    try {
        const { email } = req.user;
        const { parentFolderId, sort } = req.query;

        let sortObj = { updatedAt: -1 };
        if (sort === 'oldest') sortObj = { updatedAt: 1 };
        else if (sort === 'name_asc') sortObj = { name: 1 };
        else if (sort === 'name_desc') sortObj = { name: -1 };

        const user = await User.findOne({ email });
        let query = user.groupId 
            ? { groupId: user.groupId, parentFolderId: parentFolderId || null } 
            : { ownerEmail: email, parentFolderId: parentFolderId || null };

        const folders = await Folder.find(query).sort(sortObj);

        res.status(200).json({ folders });
    } catch (error) {
        console.error("Error getting folders:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const renameFolder = async (req, res) => {
    try {
        const { email } = req.user;
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Folder name is required" });
        }

        const user = await User.findOne({ email });
        let query = user.groupId 
            ? { _id: id, groupId: user.groupId } 
            : { _id: id, ownerEmail: email };

        const folder = await Folder.findOneAndUpdate(
            query,
            { name },
            { new: true }
        );

        if (!folder) {
            return res.status(404).json({ error: "Folder not found" });
        }

        res.status(200).json({ folder });
    } catch (error) {
        console.error("Error renaming folder:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteFolder = async (req, res) => {
    try {
        const { email } = req.user;
        const { id } = req.params;

        const user = await User.findOne({ email });
        const folderQuery = user.groupId 
            ? { parentFolderId: folderId, groupId: user.groupId } 
            : { parentFolderId: folderId, ownerEmail: email };
            
        const deleteFolderRecursive = async (folderId) => {
            const childFolders = await Folder.find(folderQuery);
            for (const child of childFolders) {
                await deleteFolderRecursive(child._id);
            }

            const fileQuery = user.groupId 
                ? { folderId: folderId, groupId: user.groupId } 
                : { folderId: folderId, ownerEmail: email };
            const files = await File.find(fileQuery);
            for (const file of files) {
                for (const chunk of file.chunks) {
                    try {
                        const token = await getValidToken(chunk.youtubeAccountEmail);
                        const chunkUser = await User.findOne({ email: chunk.youtubeAccountEmail });
                        const oauth2Client = getOAuth2Client();
                        oauth2Client.setCredentials({
                            access_token: token,
                            refresh_token: chunkUser?.youtube?.refreshToken || ''
                        });

                        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
                        await youtube.videos.delete({ id: chunk.videoId });
                    } catch (err) {
                        console.error(`Failed to delete YouTube video ${chunk.videoId} for file ${file._id}:`, err.message);
                    }
                }
                await File.deleteOne({ _id: file._id });
            }

            await Folder.deleteOne({ _id: folderId });
        };

        const rootQuery = user.groupId 
            ? { _id: id, groupId: user.groupId } 
            : { _id: id, ownerEmail: email };
        const rootFolder = await Folder.findOne(rootQuery);
        if (!rootFolder) {
            return res.status(404).json({ error: "Folder not found" });
        }

        await deleteFolderRecursive(id);

        res.status(200).json({ message: "Folder and all its contents deleted successfully" });
    } catch (error) {
        console.error("Error deleting folder:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
