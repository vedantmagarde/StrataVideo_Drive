# StrataVideo Drive - Roadmap and Progress Tracker

Welcome to the central tracker for the StrataVideo Drive project. This document outlines the initial phases, features built, and tracks overall progress.

## Overview
StrataVideo Drive is an infinite cloud storage system utilizing YouTube's infrastructure. Files are encrypted, broken into chunks, encoded with Reed-Solomon error correction, and rendered as videos. These videos are uploaded as unlisted to user-connected YouTube accounts. When a user requests a file, the system downloads the video chunks, decodes them back to binary data, applies error correction, decrypts, and reconstructs the original file.

---

## Progress Tracking

### [x] Phase 1: Complete Backend Scaffold
- Configured Express with security middlewares (Helmet, CORS, Rate Limiting).
- Initialized MongoDB connection.
- Set up initial routing scaffolding for Auth, Group, YouTube, and Files.
- Created `/tmp` auto-initialization for transient file handling.
- Configured Docker (`Dockerfile`) incorporating `Node 20`, `ffmpeg`, and `yt-dlp`.

### [x] Phase 2: Firebase Auth
- Implemented `verifyFirebaseToken` middleware to act as the primary security layer, decoding tokens from `firebase-admin`.
- Constructed `User` and `Group` Mongoose schemas.
- Developed `authController.js` to handle `/sync` for auto-linking newly invited users to their respective groups using only their email.
- Set up `/me` route to retrieve the current session data securely.

### [x] Phase 3: Group Management
- Allowed group owners to create a shared storage space.
- Provided functionality for the group owner to invite members via email.
- Provided capabilities for group owners to remove members.
- Created `MemberTable` to list group members, their roles, and their linked YouTube quotas.

### [x] Phase 4: YouTube OAuth2
- Integrated `googleapis` to manage standard YouTube OAuth 2.0 flow.
- Successfully exchanged authorization codes for `access_token` and `refresh_token`.
- Included functionality to fetch the linked YouTube channel name and channel ID.
- Configured a `node-cron` midnight job to automatically reset the `quotaUsed` variable for all connected accounts back to 0.

### [x] Phase 5: Encryption + Encoding Utils
- Implemented strict AES-256-CBC encryption/decryption keys derived symmetrically from user email via `pbkdf2Sync`.
- Solved heavy disk I/O bottlenecks by piping raw `RGBA` frame chunks via `Buffer` to `ffmpeg.stdin`.
- Increased rendering rate to `30 fps` to bypass YouTube's 12-hour video restriction limit.
- Piped yt-dlp downloaded MP4 files through `ffmpeg.stdout` to sample 16x16 center pixels back to binary data.

### [x] Phase 6: Job Queue
- Structured Upstash Redis instance configurations.
- Engineered Bull workers (`uploadWorker`, `downloadWorker`) for reliable asynchronous background processing.
- Implemented account rotation mechanisms to upload to the YouTube account in the group that has the least quota used.
- Implemented a variable 2-5 minute upload rate limit delay between chunks.

### [x] Phase 7: File API
- Developed robust handling utilizing `multer` with a 5GB limit for large file chunking logic.
- Supported `/search` endpoint alongside standard listing.
- Established strict cleanup logic to safely delete files and their respective YouTube videos globally.

### [x] Phase 8: Email Notifications
- Set up `Resend` SDK configurations to dispatch transactional notification emails.
- Built email templates corresponding to Upload Completion, Upload Failure, and Download Readiness states.

### [x] Phase 9: React Frontend UI
- Engineered modern, clean architecture with `Tailwind CSS v3`.
- Implemented secure Axios request interceptors ensuring `Authorization: Bearer <token>` injection for all requests.
- Constructed multiple context-driven React components:
    - `Sidebar.jsx` for seamless navigation.
    - `FileCard.jsx` for clean visual file representations with lucide-react icons based on MIME types.
    - `JobStatusPoller.jsx` for dynamic active background task listening.
    - `MemberTable.jsx` for complete group overview matrices.
- Used `firebase/auth` exclusively via standard Google Provider Sign-In methods.

### [x] Phase 10: Production Deployment
- Wrote full `render.yaml` specification configured exactly to scale Docker deployments via render.
- Implemented `vercel.json` SPA redirection rewrites.

---

## Refactoring Log
- **[Date]:** Base phases (1-10) fully constructed.
- **[Date]:** Codebase sweep executed to "humanize" the logic structure. Code comments explicitly removed in favor of descriptive variable names, streamlined syntax, and cleanly segregated architectural patterns.
