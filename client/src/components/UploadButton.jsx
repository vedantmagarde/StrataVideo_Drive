import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Loader2, Shield, Play, X } from 'lucide-react';
import api from '../api/axios';

const UploadButton = ({ onQueued, currentFolderId }) => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const hasVideo = files.some(file => file.type.startsWith('video/'));
        if (hasVideo) {
            setPendingFiles(files);
            setShowModal(true);
        } else {
            executeUpload(files, 'encrypted');
        }
    };

    const executeUpload = async (files, method) => {
        setIsUploading(true);
        setUploadProgress(0);
        setShowModal(false);

        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        const loadedSizes = new Array(files.length).fill(0);

        try {
            await Promise.all(files.map(async (file, index) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('uploadMethod', method);
                if (currentFolderId) formData.append('folderId', currentFolderId);

                const res = await api.post('/files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        loadedSizes[index] = progressEvent.loaded;
                        const currentTotalLoaded = loadedSizes.reduce((a, b) => a + b, 0);
                        const percentCompleted = Math.round((currentTotalLoaded * 100) / totalSize);
                        setUploadProgress(percentCompleted);
                    }
                });
                if (onQueued) onQueued(res.data.jobId);
            }));
        } catch (error) {
            console.error("Upload failed with error:", error);
            alert("Upload failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setPendingFiles([]);
        }
    };

    return (
        <div>
            <input
                type="file"
                multiple
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

            {showModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Video Upload Options</h2>
                            <button onClick={() => { setShowModal(false); setPendingFiles([]); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <button
                                onClick={() => executeUpload(pendingFiles, 'direct')}
                                className="w-full text-left p-4 rounded-xl border-2 border-purple-500 bg-purple-50 hover:bg-purple-100 transition-colors group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-500 text-white rounded-lg group-hover:scale-105 transition-transform">
                                        <Play className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-purple-900">Streamable Media (Recommended)</h3>
                                </div>
                                <p className="text-sm text-purple-700 ml-11">
                                    Fast upload. Stream instantly. (Warning: Subject to slight YouTube compression and standard copyright checks).
                                </p>
                            </button>

                            <button
                                onClick={() => executeUpload(pendingFiles, 'encrypted')}
                                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-slate-100 text-slate-500 group-hover:bg-blue-500 group-hover:text-white rounded-lg transition-colors">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-slate-700 group-hover:text-blue-900">Secure Storage</h3>
                                </div>
                                <p className="text-sm text-slate-500 group-hover:text-blue-700 ml-11">
                                    100% private, AES-256 encrypted. Perfect quality retention. Slower upload.
                                </p>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UploadButton;
