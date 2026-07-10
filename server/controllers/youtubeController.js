import { google } from 'googleapis';
import User from '../models/User.js';

export const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
    );
};

export const authRedirect = async (req, res) => {
    try {
        const { email } = req.user;
        const oauth2Client = getOAuth2Client();


        const state = Buffer.from(email).toString('base64');
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/youtube',
                'https://www.googleapis.com/auth/youtube.upload', 
                'https://www.googleapis.com/auth/youtube.readonly'
            ],
            state
        });
        res.status(200).json({ url: authUrl });
    } catch (error) {
        console.error("Error generating auth url:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const oauthCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).send("Authorization code is required");
        }

        // Decode the email from the state parameter
        const email = Buffer.from(state, 'base64').toString('ascii');

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);


        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelRes = await youtube.channels.list({
            part: 'snippet',
            mine: true
        });

        const channel = channelRes.data.items[0];


        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send("User not found");
        }

        user.youtube = {
            connected: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            channelId: channel?.id,
            channelName: channel?.snippet?.title || 'Unknown Channel',
            quotaUsed: 0,
            quotaResetAt: new Date(new Date().setHours(24, 0, 0, 0))
        };
        await user.save();

        // Redirect back to the dashboard with success
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
        console.error("Error handling youtube callback:", error);
        res.status(500).send("Internal server error during YouTube connection");
    }
};

export const disconnect = async (req, res) => {
    try {
        const { email } = req.user;

        const user = await User.findOne({ email });
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


export const getValidToken = async (email) => {
    const user = await User.findOne({ email });
    if (!user || !user.youtube.connected) {
        throw new Error(`YouTube not connected for user ${email}`);
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: user.youtube.accessToken,
        refresh_token: user.youtube.refreshToken,
    });



    const { token } = await oauth2Client.getAccessToken();

    if (token !== user.youtube.accessToken) {
        user.youtube.accessToken = token;
        await user.save();
    }

    return token;
};


export const getAvailableAccount = async (identifier) => {
    // Identifier can be a groupId or an email address (ownerEmail fallback)
    let query = {};
    if (identifier && identifier.includes('@')) {
        // It's an email address
        query = { email: identifier, 'youtube.connected': true };
    } else {
        // It's a groupId
        query = { groupId: identifier, 'youtube.connected': true };
    }

    const members = await User.find(query);

    if (!members.length) {
        throw new Error("No connected YouTube accounts found. Please connect your YouTube account in the dashboard first.");
    }


    const available = members.filter(m => m.youtube.quotaUsed < 8000);

    if (!available.length) {
        throw new Error("All connected YouTube accounts have exhausted their quota.");
    }


    available.sort((a, b) => a.youtube.quotaUsed - b.youtube.quotaUsed);

    return available[0];
};
