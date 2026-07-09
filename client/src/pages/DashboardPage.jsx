import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import UploadButton from '../components/UploadButton';
import JobStatusPoller from '../components/JobStatusPoller';
import api from '../api/axios';
import { Search } from 'lucide-react';

const DashboardPage = () => {
    const [files, setFiles] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchFiles = async () => {
        try {
            const endpoint = searchQuery ? `/files/search?q=${searchQuery}` : '/files';
            const res = await api.get(endpoint);
            setFiles(res.data.files);
        } catch (error) {
            console.error("Error fetching files:", error);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [searchQuery]);

    const handleUploadQueued = (jobId) => {
        setActiveJobs(prev => [...prev, jobId]);
    };

    const handleJobComplete = () => {
        fetchFiles(); 
        
    };

    const handleFileDelete = async (fileId) => {
        if (!confirm("Are you sure you want to delete this file and its YouTube videos?")) return;
        try {
            await api.delete(`/files/${fileId}`);
            fetchFiles();
        } catch (error) {
            console.error("Error deleting file:", error);
        }
    };

    const handleFileDownload = async (fileId) => {
        try {
            const res = await api.post(`/files/download/${fileId}`);
            setActiveJobs(prev => [...prev, res.data.jobId]);
        } catch (error) {
            console.error("Error queueing download:", error);
            alert("Error: " + error.response?.data?.error || error.message);
        }
    };

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100">
            <Sidebar />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search files..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <UploadButton onQueued={handleUploadQueued} />
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold">My Files</h2>
                    </div>
                    
                    {files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl">
                            <p className="text-slate-400">No files found. Upload something to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {files.map(file => (
                                <FileCard 
                                    key={file._id} 
                                    file={file} 
                                    onDelete={() => handleFileDelete(file._id)}
                                    onDownload={() => handleFileDownload(file._id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {}
                <div className="fixed bottom-4 right-4 flex flex-col gap-2 w-80">
                    {activeJobs.map(jobId => (
                        <JobStatusPoller 
                            key={jobId} 
                            jobId={jobId} 
                            onComplete={() => {
                                handleJobComplete();
                                setActiveJobs(prev => prev.filter(id => id !== jobId));
                            }} 
                            onFailed={() => {
                                setActiveJobs(prev => prev.filter(id => id !== jobId));
                            }}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
