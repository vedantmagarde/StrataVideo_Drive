// Map of jobId -> process to allow killing active FFmpeg/yt-dlp child processes when a job is cancelled.
export const activeJobs = new Map();
