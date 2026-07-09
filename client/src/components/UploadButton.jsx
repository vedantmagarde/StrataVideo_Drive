import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import api from '../api/axios';

const UploadButton = ({ onQueued }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (onQueued) onQueued(res.data.jobId);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed: " + error.response?.data?.error || error.message);
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
                <Upload className="w-4 h-4" />
                Upload File
            </button>
        </div>
    );
};

export default UploadButton;
