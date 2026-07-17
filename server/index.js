import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import connectDb from "./config/connectDb.js";
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import fs from "fs";

const tmpDir = './tmp';
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
}


import "./jobs/uploadWorker.js";
// The Cloud Download Worker has been restored with ejs-github yt-dlp fix
import "./jobs/downloadWorker.js";
import "./jobs/quotaReset.js";
import "./jobs/tmpCleanup.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
    console.log(`[INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
    next();
});

app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : "http://localhost:5173";
        if (!origin || origin === allowedOrigin || origin === allowedOrigin + '/') {
            callback(null, true);
        } else {
            // Log exactly what origin was blocked to help debug if it happens again
            console.error(`[CORS Blocked] Origin: ${origin}, Allowed: ${allowedOrigin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use("/api/auth", authRoutes);
app.use("/api/group", groupRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);


app.get("/api/health", (req, res) => {
    res.status(200).send("OK");
});


const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDb();
});

// Required for Render.com - increases timeout to prevent 502/CORS errors during uploads
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;