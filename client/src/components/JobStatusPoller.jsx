import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const JobStatusPoller = ({ jobId, onComplete, onFailed }) => {
    const [job, setJob] = useState(null);

    useEffect(() => {
        let interval;
        const poll = async () => {
            try {
                const res = await api.get(`/files/status/${jobId}`);
                const currentJob = res.data.job;
                setJob(currentJob);

                if (currentJob.status === 'ready') {
                    if (currentJob.type === 'download' && res.data.downloadUrl) {
                        
                        
                        const url = `${import.meta.env.VITE_API_URL.replace('/api', '')}${res.data.downloadUrl}`;
                        
                        
                        
                        api.get(res.data.downloadUrl, { responseType: 'blob' })
                            .then(response => {
                                const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = urlBlob;
                                link.setAttribute('download', 'downloaded_file'); 
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            });
                    }
                    if (onComplete) setTimeout(onComplete, 2000);
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
            </div>
            
            {}
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
