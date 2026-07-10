<!-- StrataVideo Drive -->

#  YouTube Infinite Storage — Project Roadmap

> **Project:** YTVault — Infinite Cloud Storage using YouTube as a backend  
> **Stack:** MongoDB · Express · React · Node.js (MERN)  
> **Architecture:** Users connect their own YouTube accounts via OAuth2. Files are encrypted (AES-256), chunked, encoded as B&W block videos via FFmpeg, and uploaded to YouTube. Only metadata is stored in MongoDB.

---

## 📌 Legend

| Symbol | Meaning |
|---|---|
| ✅ | Done |
| 🔄 | In Progress |
| ⬜ | Not Started |
| 🔴 | Blocked |
| ⚠️ | Needs Decision |

---

## 🟩 Phase 1 — Project Foundation
> Goal: Bare minimum working backend + frontend shell

- ✅ Initialize Node.js + Express backend
- ✅ Connect MongoDB Atlas
- ✅ Setup folder structure (`/server/jobs`, `/server/utils`, `/client/src/pages`, etc.)
- ✅ Setup `.env` file with keys (Mongo URI, Firebase credentials, YouTube client ID/secret, Redis URL, Resend Key)
- ✅ Initialize React frontend with Vite
- ✅ Setup Tailwind CSS v3
- ✅ Setup basic Express server with health check route (`GET /api/health`)
- ✅ Connect frontend to backend via Axios

---

## 🟨 Phase 2 — Group-Based User Authentication
> Goal: Users can register, login, and manage a group of emails securely without passwords.

### Backend
- ✅ Design `Group` schema (tracks `ownerEmail`, `memberEmails`, `invitedEmails`)
- ✅ Design `User` schema (linked to `groupId`)
- ✅ 100% Firebase Authentication (Google Sign-In only) — zero passwords, zero bcrypt, zero JWTs.
- ✅ Custom `verifyFirebaseToken` middleware to protect private routes using the decoded Firebase ID token.
- ✅ `POST /api/auth/sync` — automatically creates user/group records and auto-links invited members.
- ✅ `GET /api/group/members` — lists all group members + YouTube connection status.
- ✅ `POST /api/group/invite` and `DELETE /api/group/remove` for owner management.

### Frontend
- ✅ Login page with Google OAuth button.
- ✅ Protected route wrapper in React utilizing AuthContext.
- ✅ Firebase ID Token is automatically attached to every Axios request via interceptors (never stored in `localStorage`).
- ✅ Auto redirect to dashboard on login.

---

## 🟦 Phase 3 — YouTube OAuth2 Integration
> Goal: Each group member can connect their own YouTube account

### Backend
- ✅ Setup Google OAuth2 credentials (`googleapis`).
- ✅ Design embedded `youtube` object in User schema to store tokens, channel ID, and `quotaUsed`.
- ✅ `GET /api/youtube/auth` — redirect to Google OAuth2 consent screen.
- ✅ `POST /api/youtube/callback` — exchange OAuth2 authorization code for tokens.
- ✅ `POST /api/youtube/disconnect` — disconnect YouTube account.
- ✅ Internal token refresh logic (`getValidToken()`).
- ✅ Quota tracking — increment `quotaUsed` by 1600 per upload.
- ✅ Account rotation logic — automatically selects the group member's connected account with the lowest used quota.
- ✅ Node-cron midnight job to reset `quotaUsed` to 0 daily.

### Frontend
- ✅ Settings page → Profile and Group management section.
- ✅ Table showing all group member emails, roles, YouTube connection status, and visual Quota usage bars.
- ✅ "Connect YouTube Account" and "Disconnect" flow.

---

## 🟪 Phase 4 — File Encoder / Decoder Pipeline
> Goal: Convert any file ↔ YouTube video reliably, bypassing I/O bottlenecks.

### Encoder (File → Video)
- ✅ Read file as raw bytes in 50MB chunks.
- ✅ AES-256 encryption (`crypto.createCipheriv`) utilizing a persistent key derived from the owner's email (`pbkdf2Sync`).
- ✅ Reed-Solomon error correction structure setup (`@ronomon/reed-solomon`).
- ✅ **Optimized Encoding Pipeline:** Bypassed writing 116k PNG frames to disk by streaming raw RGBA pixels directly to `ffmpeg.stdin` using `spawn`.
- ✅ Rendered at `30 fps` to generate a ~1.07-hour video per 50MB chunk, safely bypassing YouTube's 12-hour maximum limit.
- ✅ Output: one `.mp4` generated in `/tmp` per chunk.

### Decoder (Video → File)
- ✅ Download unlisted chunk videos using `yt-dlp` injected with the owner's specific YouTube Bearer token.
- ✅ **Optimized Decoding Pipeline:** Spawned FFmpeg to pipe raw `-f rawvideo` directly to `stdout`, reading chunks seamlessly in-memory and sampling center pixels of the 16x16 blocks.
- ✅ Remove Reed-Solomon padding and error correct.
- ✅ AES-256 decrypt using the email-derived key.
- ✅ Reassemble chunks strictly by sequence index and yield original binary.

---

## 🟧 Phase 5 — Upload / Download Job Queue
> Goal: Handle slow YouTube uploads asynchronously with background jobs.

### Setup
- ✅ Setup Upstash Redis connection.
- ✅ Implemented `bull` message queue (`uploadQueue`, `downloadQueue`).

### Upload Flow
- ✅ `POST /api/files/upload` — Multer handles file, queues job, returns `jobId`.
- ✅ Worker rotates accounts, encodes 50MB chunk via stream, delays 2-5 minutes randomly to avoid YouTube rate limits, and uploads via YouTube Data API.
- ✅ File chunks array saved to MongoDB with respective `videoId`.

### Download Flow
- ✅ `POST /api/files/download/:fileId` — triggers download background job.
- ✅ Worker downloads chunks via `yt-dlp`, extracts bitstream, decrypts, and reassembles to `/tmp`.
- ✅ Secure `/api/files/serve/:jobId` route safely serves the final binary to the browser and automatically deletes it from the server.

---

## 🟫 Phase 6 — File Metadata & Dashboard
> Goal: Users can see, manage, and organize their files

### Backend
- ✅ `File` and `Job` schemas constructed.
- ✅ `GET /api/files` and `GET /api/files/search` implemented with MIME-type filtering capabilities.
- ✅ `DELETE /api/files/:fileId` recursively deletes MongoDB records AND loops through all chunks to actively delete the unlisted YouTube videos from the respective accounts.
- ✅ `GET /api/files/status/:jobId` serves progress polling for active queues.

### Frontend Dashboard
- ✅ Sidebar navigation to filter by Images, Videos, Audio, Documents, Archives, and Code.
- ✅ Dynamic `FileCard` component displaying size, upload date, status badges, and respective file-type icons.
- ✅ `UploadButton` mapping local system file dialog directly to Multer upload API.
- ✅ Floating `JobStatusPoller` drawer actively listens to active Queue jobs and tracks progress bars in real-time.

---

## 📧 Phase 7 — Email Notifications
> Goal: Notify user when file is ready (since uploads take time)

- ✅ Integrated Resend SDK.
- ✅ Configured HTML templates injected with dynamic filenames and completion emojis.
- ✅ Dispatches `sendUploadComplete`, `sendUploadFailed`, and `sendDownloadReady` straight from the Bull queue worker processes.

---

## 🚀 Phase 8 — Deployment
> Goal: Production scaffolding.

- ✅ Configured `Dockerfile` mapping `node:20-slim`, `ffmpeg`, and `yt-dlp` directly into the container logic for backend rendering.
- ✅ Scaffolded `render.yaml` infrastructure-as-code for server deployment.
- ✅ Setup `vercel.json` SPA rewrite configurations.

---

## 🛠 Phase 9 — Server Stability & Security Updates
> Goal: Fix module loading, environment parsing, and dependency issues for robust startup.

- ✅ Upgraded Firebase Admin SDK to v14 and refactored initialization to use the new modular API (`firebase-admin/app`).
- ✅ Fixed ES Module hoisting issues by loading `dotenv/config` globally at the top of the application.
- ✅ Installed and configured missing security and worker dependencies (`helmet`, `express-rate-limit`, `node-cron`, `file-type`).
- ✅ Improved `.env` parsing flexibility (support for both base64 `FIREBASE_SERVICE_ACCOUNT` and individual Firebase variables, plus `MONGO_URI` support).

---

## 🧰 Full Tech Stack Reference

| Category | Tool |
|---|---|
| Frontend | React + Vite + Tailwind CSS v3 |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | Firebase Auth + Google Sign-In (No Passwords) |
| YouTube | Google OAuth2 + YouTube Data API v3 |
| Encoding | FFmpeg (via `child_process.spawn` stdin/stdout streams) |
| Error Correction | `@ronomon/reed-solomon` |
| Encryption | Node.js built-in `crypto` (AES-256-CBC) |
| Job Queue | Bull + Upstash Redis |
| Video Fetching | `yt-dlp` |
| Email | Resend |

---

*Last updated: July 2026*
