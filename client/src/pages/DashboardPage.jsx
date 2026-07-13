import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import FolderCard from '../components/FolderCard';
import UploadButton from '../components/UploadButton';
import JobStatusPoller from '../components/JobStatusPoller';
import ConnectionWarningModal from '../components/ConnectionWarningModal';
import api from '../api/axios';
import FooterBar from '../components/FooterBar';
import { Search, ChevronRight, FolderPlus, ChevronDown, Clock, ArrowDownAZ, ArrowUpZA } from 'lucide-react';

const DashboardPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [folderPath, setFolderPath] = useState([{ id: null, name: 'Root' }]);
    const [sortOption, setSortOption] = useState('newest');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);

    useEffect(() => {
        const handleWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                setZoomLevel(prev => {
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    return Math.max(0.5, Math.min(prev + delta, 3));
                });
            }
        };

        const container = document.getElementById('main-scroll-container');
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => container.removeEventListener('wheel', handleWheel);
        }
    }, []);

    useEffect(() => {
        if (location.state?.category !== undefined) {
            setActiveCategory(location.state.category);
            if (location.state.category === null) {
                setCurrentFolderId(null);
                setFolderPath([{ id: null, name: 'Root' }]);
            }
            // Clear the state so it doesn't get stuck if they reload
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    const fetchMembers = async () => {
        try {
            const res = await api.get('/group/members');
            const members = res.data.members;
            setGroupMembers(members);
            
            const connectedCount = members.filter(m => m.youtube?.connected).length;
            if (connectedCount < 2) {
                // Check if user already dismissed it this session, optional. 
                // For now, always show until they connect 2.
                setIsWarningModalOpen(true);
            }
        } catch (error) {
            console.error("Error fetching group members:", error);
        }
    };

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
                params.append('sort', sortOption);
                if (params.toString()) filesEndpoint += `?${params.toString()}`;
            }
            const filesRes = await api.get(filesEndpoint);
            setFiles(filesRes.data.files);

            // Fetch Folders
            if (!searchQuery && !activeCategory) {
                const foldersEndpoint = currentFolderId ? `/folders?parentFolderId=${currentFolderId}&sort=${sortOption}` : `/folders?sort=${sortOption}`;
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
        fetchMembers();
    }, [searchQuery, activeCategory, currentFolderId, sortOption]);

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

    const combinedContent = [
        ...folders.map(f => {
            const dateToUse = sortOption === 'oldest' ? f.createdAt : (f.updatedAt || f.createdAt);
            return { 
                ...f, 
                itemType: 'folder', 
                sortDate: new Date(dateToUse).getTime(), 
                sortName: (f.name || '').toLowerCase() 
            };
        }),
        ...files.map(f => ({ ...f, itemType: 'file', sortDate: new Date(f.uploadedAt).getTime(), sortName: (f.filename || '').toLowerCase() }))
    ];

    combinedContent.sort((a, b) => {
        if (sortOption === 'newest') return b.sortDate - a.sortDate;
        if (sortOption === 'oldest') return a.sortDate - b.sortDate;
        if (sortOption === 'name_asc') return a.sortName.localeCompare(b.sortName);
        if (sortOption === 'name_desc') return b.sortName.localeCompare(a.sortName);
        return 0;
    });

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    activeCategory={activeCategory} 
                    setActiveCategory={(cat) => {
                        setActiveCategory(cat);
                        if (cat !== null) {
                            setFolderPath([{ id: null, name: 'Root' }]);
                        }
                    }} 
                    setCurrentFolderId={setCurrentFolderId} 
                    groupMembers={groupMembers}
                />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/50 backdrop-blur relative z-20">
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
                        <div className="relative">
                            <button 
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                {sortOption === 'newest' && <Clock className="w-4 h-4" />}
                                {sortOption === 'oldest' && <Clock className="w-4 h-4" />}
                                {sortOption === 'name_asc' && <ArrowDownAZ className="w-4 h-4" />}
                                {sortOption === 'name_desc' && <ArrowUpZA className="w-4 h-4" />}
                                
                                {sortOption === 'newest' && 'Newest First'}
                                {sortOption === 'oldest' && 'Oldest First'}
                                {sortOption === 'name_asc' && 'Name (A-Z)'}
                                {sortOption === 'name_desc' && 'Name (Z-A)'}
                                
                                <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
                            </button>
                            
                            {isSortOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50">
                                    <button 
                                        onClick={() => { setSortOption('newest'); setIsSortOpen(false); }}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${sortOption === 'newest' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <Clock className="w-4 h-4" /> Newest First
                                    </button>
                                    <button 
                                        onClick={() => { setSortOption('oldest'); setIsSortOpen(false); }}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${sortOption === 'oldest' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <Clock className="w-4 h-4" /> Oldest First
                                    </button>
                                    <button 
                                        onClick={() => { setSortOption('name_asc'); setIsSortOpen(false); }}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${sortOption === 'name_asc' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <ArrowDownAZ className="w-4 h-4" /> Name (A-Z)
                                    </button>
                                    <button 
                                        onClick={() => { setSortOption('name_desc'); setIsSortOpen(false); }}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${sortOption === 'name_desc' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <ArrowUpZA className="w-4 h-4" /> Name (Z-A)
                                    </button>
                                </div>
                            )}
                        </div>

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

                <div id="main-scroll-container" className="flex-1 overflow-y-auto px-8 pt-4 pb-8 relative">
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
                        <div 
                            className="grid gap-6 pb-20"
                            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${250 * zoomLevel}px, 1fr))` }}
                        >
                            {combinedContent.map(item => (
                                item.itemType === 'folder' ? (
                                    <FolderCard
                                        key={`folder-${item._id}`}
                                        folder={item}
                                        onClick={() => navigateToFolder(item._id, item.name)}
                                        onDelete={() => handleFolderDelete(item._id)}
                                        onRename={(newName) => handleFolderRename(item._id, newName)}
                                    />
                                ) : (
                                    <FileCard
                                        key={`file-${item._id}`}
                                        file={item}
                                        onDelete={() => handleFileDelete(item._id)}
                                        onDownload={() => handleFileDownload(item._id)}
                                    />
                                )
                            ))}
                        </div>
                    )}
                    
                    <div className="fixed bottom-20 right-4 flex flex-col gap-2 w-80 z-40">
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
                </div>
            </main>
        </div>
        
        <FooterBar groupMembers={groupMembers} />

        <ConnectionWarningModal 
            isOpen={isWarningModalOpen} 
            onClose={() => setIsWarningModalOpen(false)} 
            members={groupMembers} 
        />
    </div>
    );
};

export default DashboardPage;
