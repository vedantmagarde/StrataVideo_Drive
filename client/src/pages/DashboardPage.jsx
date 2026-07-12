import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import FolderCard from '../components/FolderCard';
import UploadButton from '../components/UploadButton';
import JobStatusPoller from '../components/JobStatusPoller';
import api from '../api/axios';
import { Search, ChevronRight, FolderPlus } from 'lucide-react';

const DashboardPage = () => {
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [folderPath, setFolderPath] = useState([{ id: null, name: 'Root' }]);

    const fetchContent = async () => {
        try {
            // Fetch Files
            let filesEndpoint = '/files';
            if (searchQuery) {
                filesEndpoint = `/files/search?q=${searchQuery}`;
            } else {
                const params = new URLSearchParams();
                if (activeCategory) params.append('type', activeCategory);
                if (currentFolderId) params.append('folderId', currentFolderId);
                if (params.toString()) filesEndpoint += `?${params.toString()}`;
            }
            const filesRes = await api.get(filesEndpoint);
            setFiles(filesRes.data.files);

            // Fetch Folders
            if (!searchQuery && !activeCategory) {
                const foldersEndpoint = currentFolderId ? `/folders?parentFolderId=${currentFolderId}` : '/folders';
                const foldersRes = await api.get(foldersEndpoint);
                setFolders(foldersRes.data.folders);
            } else {
                setFolders([]);
            }
        } catch (error) {
            console.error("Error fetching content:", error);
        }
    };

    useEffect(() => {
        fetchContent();
    }, [searchQuery, activeCategory, currentFolderId]);

    const handleUploadQueued = (jobId) => {
        setActiveJobs(prev => [...prev, jobId]);
    };

    const handleJobComplete = () => {
        fetchContent();
    };

    const handleFileDelete = async (fileId) => {
        if (!confirm("Are you sure you want to delete this file and its YouTube videos?")) return;
        try {
            await api.delete(`/files/${fileId}`);
            fetchContent();
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

    const handleCreateFolder = async () => {
        const name = prompt("Enter folder name:");
        if (!name) return;
        try {
            await api.post('/folders', { name, parentFolderId: currentFolderId });
            fetchContent();
        } catch (error) {
            console.error("Error creating folder:", error);
        }
    };

    const handleFolderDelete = async (folderId) => {
        if (!confirm("Are you sure you want to delete this folder and ALL its contents?")) return;
        try {
            await api.delete(`/folders/${folderId}`);
            fetchContent();
        } catch (error) {
            console.error("Error deleting folder:", error);
        }
    };

    const handleFolderRename = async (folderId, newName) => {
        try {
            await api.put(`/folders/${folderId}`, { name: newName });
            fetchContent();
        } catch (error) {
            console.error("Error renaming folder:", error);
        }
    };

    const navigateToFolder = (folderId, folderName) => {
        setCurrentFolderId(folderId);
        setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
    };

    const navigateToBreadcrumb = (index) => {
        const newPath = folderPath.slice(0, index + 1);
        setFolderPath(newPath);
        setCurrentFolderId(newPath[newPath.length - 1].id);
    };

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900">
            <Sidebar 
                activeCategory={activeCategory} 
                setActiveCategory={(cat) => {
                    setActiveCategory(cat);
                    if (cat !== null) {
                        setFolderPath([{ id: null, name: 'Root' }]);
                    }
                }} 
                setCurrentFolderId={setCurrentFolderId} 
            />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/50 backdrop-blur">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search files..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
                        />
                    </div>
                    <div className="flex gap-4 items-center">
                        {!searchQuery && !activeCategory && (
                            <button 
                                onClick={handleCreateFolder}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <FolderPlus className="w-4 h-4" />
                                New Folder
                            </button>
                        )}
                        <UploadButton onQueued={handleUploadQueued} currentFolderId={currentFolderId} />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="mb-6 flex items-center text-lg font-bold text-slate-800">
                        {searchQuery ? (
                            <span>Search Results</span>
                        ) : activeCategory ? (
                            <span className="capitalize">{activeCategory}s</span>
                        ) : (
                            <div className="flex items-center flex-wrap gap-2">
                                {folderPath.map((crumb, idx) => (
                                    <React.Fragment key={crumb.id || 'root'}>
                                        <button 
                                            onClick={() => navigateToBreadcrumb(idx)}
                                            className={`hover:text-blue-600 transition-colors ${idx === folderPath.length - 1 ? 'text-slate-900' : 'text-slate-500'}`}
                                        >
                                            {crumb.name}
                                        </button>
                                        {idx < folderPath.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>

                    {files.length === 0 && folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 bg-white rounded-xl">
                            <p className="text-slate-500">No content found here. Upload a file or create a folder!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {folders.map(folder => (
                                <FolderCard
                                    key={folder._id}
                                    folder={folder}
                                    onClick={() => navigateToFolder(folder._id, folder.name)}
                                    onDelete={() => handleFolderDelete(folder._id)}
                                    onRename={(newName) => handleFolderRename(folder._id, newName)}
                                />
                            ))}
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
