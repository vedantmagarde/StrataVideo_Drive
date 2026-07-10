import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import api from '../api/axios';

const UploadButton = ({ onQueued }) => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        console.log("CRITICAL DEBUG: About to send upload request to:", api.defaults.baseURL);

        try {
            const res = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            if (onQueued) onQueued(res.data.jobId);
        } catch (error) {
            console.error("Upload failed with error:", error);
            console.error("Error Message:", error.message);
            console.error("Error Response Data:", error.response?.data);
            console.error("Error Status:", error.response?.status);

            if (error.message === "Network Error") {
                console.error("CRITICAL: The frontend cannot reach the backend server. Is the Node.js server running on port 5000?");
            }

            alert("Upload failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-40 h-10 ${
                    isUploading 
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed shadow-none border border-slate-200' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
            >
                {/* Background Progress Bar */}
                {isUploading && (
                    <div 
                        className="absolute left-0 top-0 bottom-0 bg-blue-600/30 transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                    />
                )}
                
                {/* Foreground Content */}
                <span className="relative flex items-center gap-2 z-10">
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            {uploadProgress}%
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Upload File
                        </>
                    )}
                </span>
            </button>
        </div>
    );
};

export default UploadButton;
