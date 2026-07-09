import { google } from 'googleapis';
import User from '../models/User.js';

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
    );
};

export const getAuthUrl = async (req, res) => {
    try {
        const oauth2Client = getOAuth2Client();
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']
        });
        res.status(200).json({ url: authUrl });
    } catch (error) {
        console.error("Error generating auth url:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const handleCallback = async (req, res) => {
    try {
        const { userEmail } = req;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: "Authorization code is required" });
        }

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Fetch channel info
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelRes = await youtube.channels.list({
            part: 'snippet',
            mine: true
        });

        const channel = channelRes.data.items[0];

        // Save to user
        const user = await User.findOne({ email: userEmail });
        user.youtube = {
            connected: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            channelId: channel.id,
            channelName: channel.snippet.title,
            quotaUsed: 0,
            quotaResetAt: new Date(new Date().setHours(24, 0, 0, 0)) // midnight tonight
        };
        await user.save();

        res.status(200).json({ message: "YouTube connected successfully", user });
    } catch (error) {
        console.error("Error handling youtube callback:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const disconnect = async (req, res) => {
    try {
        const { userEmail } = req;
        
        const user = await User.findOne({ email: userEmail });
        user.youtube = {
            connected: false,
            accessToken: null,
            refreshToken: null,
            channelId: null,
            channelName: null,
            quotaUsed: 0,
            quotaResetAt: null
        };
        await user.save();

        res.status(200).json({ message: "YouTube disconnected successfully" });
    } catch (error) {
        console.error("Error disconnecting youtube:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
