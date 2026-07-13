import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { auth } from '../firebase';
import { CheckCircle2, XCircle, Loader2, Download, X } from 'lucide-react';

const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05); 
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1); 
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 1);
    } catch (e) {
        console.error("Audio notification failed:", e);
    }
};

const JobStatusPoller = ({ jobId, onComplete, onFailed }) => {
    const [job, setJob] = useState(null);
    const [downloadData, setDownloadData] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        let interval;
        const poll = async () => {
            try {
                const res = await api.get(`/files/status/${jobId}`);
                const currentJob = res.data.job;
                setJob(currentJob);

                if (currentJob.status === 'ready') {
                    playNotificationSound();
                    if (currentJob.type === 'download' && res.data.downloadUrl) {
                        // Store the url and filename to let the user trigger it manually
                        setDownloadData({
                            url: res.data.downloadUrl,
                            filename: res.data.filename || 'downloaded_file'
                        });
                    } else {
                        if (onComplete) setTimeout(onComplete, 2000);
                    }
                    clearInterval(interval);
                } else if (currentJob.status === 'failed') {
                    if (onFailed) setTimeout(onFailed, 4000);
                    clearInterval(interval);
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        };

        poll(); 
        interval = setInterval(poll, 3000);
        
        return () => clearInterval(interval);
    }, [jobId, onComplete, onFailed]);

    const handleSaveFile = async () => {
        if (!downloadData) return;
        setIsDownloading(true);
        try {
            const token = await auth.currentUser.getIdToken(true);
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const urlPath = downloadData.url.startsWith('/api') 
                ? downloadData.url.replace('/api', '') 
                : downloadData.url;
            
            const fullUrl = `${baseUrl}${urlPath}?token=${token}`;
            
            const link = document.createElement('a');
            link.href = fullUrl;
            link.setAttribute('download', downloadData.filename); 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (onComplete) setTimeout(onComplete, 1000);
        } catch (error) {
            console.error("Error saving file:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCancel = async () => {
        try {
            await api.put(`/files/cancel/${jobId}`);
            setJob(prev => ({...prev, status: 'failed', error: 'Cancelled by user'}));
            if (onFailed) setTimeout(onFailed, 2000);
        } catch (error) {
            console.error("Error cancelling job:", error);
        }
    };

    if (!job) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-lg flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
                {job.status === 'pending' || job.status === 'processing' ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : job.status === 'ready' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                )}
                
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize">
                        {job.type}ing...
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                        {job.status === 'failed' ? job.error : `${job.progress}% complete`}
                    </p>
                </div>
                
                {(job.status === 'pending' || job.status === 'processing') && (
                    <button 
                        onClick={handleCancel}
                        className="ml-auto text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                        title="Cancel Job"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                
                {downloadData && (
                    <button 
                        onClick={handleSaveFile}
                        disabled={isDownloading}
                        className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Save File
                    </button>
                )}
            </div>
            
            {(job.status === 'pending' || job.status === 'processing') && (
                <div 
                    className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-500" 
                    style={{ width: `${job.progress}%` }}
                />
            )}
        </div>
    );
};

export default JobStatusPoller;
