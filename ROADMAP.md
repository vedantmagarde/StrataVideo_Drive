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

- ⬜ Initialize Node.js + Express backend
- ⬜ Connect MongoDB Atlas (free tier)
- ⬜ Setup folder structure
  ```
  /server
    /controllers
    /models
    /routes
    /middleware
    /jobs
    /utils
  /client
    /src
      /pages
      /components
      /context
      /utils
  ```
- ⬜ Setup `.env` file with all keys (Mongo URI, JWT secret, YouTube client ID/secret)
- ⬜ Setup `nodemon` for dev server
- ⬜ Initialize React frontend with Vite
- ⬜ Setup Tailwind CSS
- ⬜ Setup basic Express server with health check route (`GET /api/health`)
- ⬜ Connect frontend to backend via Axios

---

## 🟨 Phase 2 — Group-Based User Authentication
> Goal: Users can register, login, and manage a group of emails

### Backend
- ⬜ Design `Group` schema
  ```json
  {
    "groupId": "uuid",
    "ownerEmail": "string",
    "members": [
      {
        "email": "string",
        "passwordHash": "string",
        "role": "owner | member",
        "addedAt": "date"
      }
    ]
  }
  ```
- ⬜ Design `User` schema (links to a group)
- ⬜ `POST /api/auth/register` — creates user + group
- ⬜ `POST /api/auth/login` — any group member can login
- ⬜ JWT token generation on login
- ⬜ Auth middleware (protect private routes)
- ⬜ `POST /api/group/add-member` — owner adds email to group
- ⬜ `DELETE /api/group/remove-member` — owner removes member
- ⬜ `GET /api/group/members` — list all group members + YouTube status

### Frontend
- ⬜ Register page (email + password)
- ⬜ Login page (email + password)
- ⬜ JWT stored in `httpOnly` cookie or memory (NOT localStorage)
- ⬜ Protected route wrapper in React
- ⬜ Auto redirect to dashboard on login
- ⬜ Logout button

---

## 🟦 Phase 3 — YouTube OAuth2 Integration
> Goal: Each group member can connect their own YouTube account

### Backend
- ⬜ Setup Google OAuth2 credentials (Google Cloud Console)
- ⬜ Design `YouTubeAccount` embedded in User schema
  ```json
  {
    "connected": "boolean",
    "channelId": "string",
    "channelName": "string",
    "accessToken": "string",
    "refreshToken": "string",
    "quotaUsed": "number",
    "quotaLimit": 10000,
    "quotaResetAt": "date"
  }
  ```
- ⬜ `GET /api/youtube/auth` — redirect to Google OAuth2
- ⬜ `GET /api/youtube/callback` — handle OAuth2 callback, store tokens
- ⬜ `POST /api/youtube/disconnect` — revoke and remove tokens
- ⬜ Token refresh logic (access token expires every 1 hour)
  ```javascript
  // Auto refresh before every YouTube API call
  if (tokenExpired) refreshAccessToken(refreshToken)
  ```
- ⬜ Quota tracking — increment `quotaUsed` by 1600 per upload
- ⬜ Quota reset — cron job resets `quotaUsed` to 0 at midnight daily
- ⬜ Account rotation logic — pick group member account with lowest quota used

### Frontend
- ⬜ Settings page → "My Group" section
- ⬜ Table showing all group member emails + YouTube connection status
- ⬜ "Connect YouTube →" button beside each unconnected email
- ⬜ "Disconnect" button beside connected accounts
- ⬜ Quota usage bar per account

---

## 🟪 Phase 4 — File Encoder / Decoder Pipeline
> Goal: Convert any file ↔ YouTube video reliably

> ⚠️ **Build and test this in isolation BEFORE integrating with the web app**

### Encoder (File → Video)
- ⬜ Read file as raw bytes
- ⬜ AES-256 encryption using key derived from user password
  ```javascript
  // Key derived from password — NEVER stored
  crypto.pbkdf2Sync(password, userId, 100000, 32, 'sha256')
  ```
- ⬜ Reed-Solomon error correction (npm: `reedsolo`)
- ⬜ Split into chunks if file > threshold (e.g. 50MB per chunk)
- ⬜ Encode each chunk as large B&W pixel blocks (16x16 blocks per bit)
- ⬜ Render blocks as video frames using FFmpeg
  ```bash
  ffmpeg -framerate 1 -i frame%d.png -c:v libx264 output.mp4
  ```
- ⬜ Output: one `.mp4` per chunk

### Decoder (Video → File)
- ⬜ Download video using `yt-dlp` (NOT ytdl-core)
  ```javascript
  exec(`yt-dlp -o output.mp4 https://youtube.com/watch?v=${videoId}`)
  ```
- ⬜ Extract frames from video using FFmpeg
- ⬜ Read B&W pixel blocks → reconstruct bytes
- ⬜ Apply Reed-Solomon error correction (fix compression damage)
- ⬜ AES-256 decrypt using user's password-derived key
- ⬜ Reassemble chunks in correct order
- ⬜ Output: original file with original extension

### Testing Checklist
- ⬜ Test with small text file (1KB)
- ⬜ Test with image (500KB)
- ⬜ Test with PDF (5MB)
- ⬜ Test with large file needing chunking (100MB+)
- ⬜ Confirm file after decode matches original (MD5 checksum)

---

## 🟧 Phase 5 — Upload / Download Job Queue
> Goal: Handle slow YouTube uploads asynchronously

### Setup
- ⬜ Setup Upstash Redis (free tier — 10,000 req/day)
- ⬜ Install Bull (`npm install bull`)
- ⬜ Create `uploadQueue` for encoding + uploading jobs
- ⬜ Create `downloadQueue` for fetching + decoding jobs

### Upload Job Flow
```
User uploads file
      ↓
Save temp file to /tmp
      ↓
Add job to uploadQueue
      ↓
Return jobId to frontend immediately
      ↓
Worker picks up job:
  → Encrypt → Chunk → Encode → Upload to YouTube
      ↓
Update file status in MongoDB: pending → processing → ready
      ↓
Send email notification to user
```

- ⬜ `POST /api/files/upload` — receive file, queue job, return jobId
- ⬜ `GET /api/files/status/:jobId` — frontend polls this for progress
- ⬜ Upload worker (`/jobs/uploadWorker.js`)
- ⬜ Delete temp file after successful upload
- ⬜ Handle failed jobs (retry up to 3 times)

### Download Job Flow
```
User clicks Download
      ↓
Add job to downloadQueue
      ↓
Return jobId to frontend
      ↓
Worker: fetch all chunks from YouTube → decode → decrypt → reassemble
      ↓
File ready → send download link (temp signed URL)
      ↓
Auto delete temp file after 10 minutes
```

- ⬜ `POST /api/files/download/:fileId` — queue download job
- ⬜ `GET /api/files/download-ready/:jobId` — poll until file ready
- ⬜ Download worker (`/jobs/downloadWorker.js`)

---

## 🟫 Phase 6 — File Metadata & Dashboard
> Goal: Users can see, manage, and organize their files

### Backend
- ⬜ Design `File` schema
  ```json
  {
    "fileId": "uuid",
    "groupId": "string",
    "uploadedBy": "email",
    "filename": "string",
    "originalExtension": "string",
    "mimeType": "string",
    "fileSizeBytes": "number",
    "status": "pending | processing | ready | failed",
    "uploadedAt": "date",
    "chunks": [
      {
        "chunkIndex": "number",
        "videoId": "string",
        "youtubeAccountUsed": "string",
        "uploadedAt": "date"
      }
    ]
  }
  ```
- ⬜ `GET /api/files` — list all files for logged-in user
- ⬜ `DELETE /api/files/:fileId` — delete file (and YouTube videos)
- ⬜ `GET /api/files/search?q=` — search by filename
- ⬜ Filter by type (image / video / audio / document / other)

### Frontend Dashboard
- ⬜ Sidebar with sections:
  - 📁 All Files
  - 🖼️ Images
  - 🎬 Videos
  - 🎵 Audio
  - 📄 Documents (PDF, Word, Excel, PPT)
  - 🗜️ Archives (ZIP, RAR)
  - 💻 Code Files
  - 📦 Others
- ⬜ File card component (filename, size, date, status badge, download button)
- ⬜ Upload button with drag-and-drop support
- ⬜ Upload progress indicator (polling job status)
- ⬜ Status badges: `Pending` `Processing` `Ready` `Failed`
- ⬜ Delete file with confirmation dialog
- ⬜ Search bar

---

## 📧 Phase 7 — Email Notifications
> Goal: Notify user when file is ready (since uploads take time)

- ⬜ Setup Resend account (free — 3,000 emails/month)
- ⬜ Send email when upload job completes
- ⬜ Send email when download is ready
- ⬜ Send email on upload failure with reason
- ⬜ Email template: clean HTML with filename + action button

---

## 🚀 Phase 8 — Deployment (All Free)
> Goal: Deploy everything at zero cost

| Service | Platform | Free Tier |
|---|---|---|
| Frontend (React) | Vercel | Unlimited |
| Backend (Node/Express) | Render | 500 hrs/month |
| Database | MongoDB Atlas | 512 MB |
| Redis / Queue | Upstash | 10,000 req/day |
| Email | Resend | 3,000/month |
| YouTube API | Google Cloud | 10,000 units/day per account |

- ⬜ Deploy backend to Render
  - Set all env variables on Render dashboard
  - Install `yt-dlp` and `ffmpeg` on Render (via build command)
- ⬜ Deploy frontend to Vercel
  - Set `VITE_API_URL` to Render backend URL
- ⬜ Setup MongoDB Atlas cluster
- ⬜ Setup Upstash Redis
- ⬜ Test full upload/download flow on production
- ⬜ Setup Google OAuth2 redirect URIs for production domain

---

## 🔒 Phase 9 — Security Hardening
> Goal: Make the app production-safe

- ⬜ Rate limiting on all API routes (`express-rate-limit`)
- ⬜ Helmet.js for HTTP security headers
- ⬜ CORS configured for production domain only
- ⬜ Input validation on all endpoints (`express-validator`)
- ⬜ File type validation on upload (check magic bytes, not just extension)
- ⬜ Max file size limit enforced
- ⬜ JWT expiry + refresh token rotation
- ⬜ Sanitize filenames before storing
- ⬜ YouTube video titles randomized (no identifiable info)
- ⬜ All YouTube videos uploaded as `unlisted`
- ⬜ Random delay between YouTube uploads (2–5 min)

---

## 🎨 Phase 10 — Polish & Resume-Ready
> Goal: Make it look and feel complete for portfolio/interviews

- ⬜ Landing page (explain what the app does)
- ⬜ Demo video / GIF for GitHub README
- ⬜ Full `README.md` with:
  - Project overview
  - Architecture diagram
  - Tech stack
  - How to run locally
  - Known limitations + how they were solved
- ⬜ GitHub repo cleaned up (no API keys, good commit history)
- ⬜ Add to resume with description:
  > *Built a full-stack MERN application that encodes any file as pixel-rendered B&W block videos using FFmpeg and Reed-Solomon error correction, uploads to user-owned YouTube accounts via OAuth2, and reconstructs files on demand — achieving free unlimited storage with AES-256 encryption and async job queues.*

---

## 🧰 Full Tech Stack Reference

| Category | Tool |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcrypt |
| YouTube | Google OAuth2 + YouTube Data API v3 |
| Encoding | FFmpeg (via fluent-ffmpeg) |
| Error Correction | reedsolo (Reed-Solomon) |
| Encryption | Node.js built-in `crypto` (AES-256) |
| Job Queue | Bull + Upstash Redis |
| YouTube Download | yt-dlp (via child_process) |
| Email | Resend |
| Hosting (frontend) | Vercel |
| Hosting (backend) | Render |

---

## 📦 npm Packages Reference

```bash
# Backend
npm install express mongoose dotenv bcryptjs jsonwebtoken
npm install multer                    # file upload handling
npm install fluent-ffmpeg             # video encoding
npm install bull ioredis              # job queue
npm install googleapis                # YouTube Data API
npm install reedsolo                  # Reed-Solomon error correction
npm install express-rate-limit helmet cors express-validator
npm install nodemailer                # or use Resend SDK
npm install uuid                      # unique IDs
npm install node-cron                 # quota reset at midnight

# Frontend
npm install axios react-router-dom
npm install tailwindcss @tailwindcss/vite
```

---

## ⚡ Quick Start Order

> If starting from scratch, do phases in this order:

```
Phase 1 → Phase 4 (encoder/decoder) → Phase 2 → Phase 3
→ Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10
```

> **Build and test the encoder/decoder first (Phase 4) before anything else.
> It is the hardest part and everything depends on it working correctly.**

---

*Last updated: July 2026*
