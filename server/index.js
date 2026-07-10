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
import fs from "fs";

const tmpDir = './tmp';
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
}


import "./jobs/uploadWorker.js";
import "./jobs/downloadWorker.js";
import "./jobs/quotaReset.js";

const app = express();
const PORT = process.env.PORT || 5000;


app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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


app.get("/api/health", (req, res) => {
    res.status(200).send("OK");
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDb();
});