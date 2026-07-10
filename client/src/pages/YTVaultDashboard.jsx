import React from 'react';
import {
    Search, Image, Film, FileText, Music, Archive, Code, Plus,
    FolderPlus, UploadCloud, Download, Trash2, HardDrive,
    CheckCircle2, XCircle, Loader2, PlaySquare, ChevronDown
} from 'lucide-react';

const DUMMY_MEMBERS = [
    { id: 1, name: 'Owner', avatar: 'https://ui-avatars.com/api/?name=Owner&background=0D8ABC&color=fff', connected: true, quota: 80, isOwner: true },
    { id: 2, name: 'Alice', avatar: 'https://ui-avatars.com/api/?name=Alice&background=FF5733&color=fff', connected: true, quota: 45 },
    { id: 3, name: 'Bob', avatar: 'https://ui-avatars.com/api/?name=Bob&background=28B463&color=fff', connected: false, quota: 0 },
    { id: 4, name: 'Charlie', avatar: 'https://ui-avatars.com/api/?name=Charlie&background=8E44AD&color=fff', connected: true, quota: 95 },
    { id: 5, name: 'Diana', avatar: 'https://ui-avatars.com/api/?name=Diana&background=F39C12&color=fff', connected: true, quota: 20 },
    { id: 6, name: 'Eve', avatar: 'https://ui-avatars.com/api/?name=Eve&background=D35400&color=fff', connected: false, quota: 0 },
];

const DUMMY_FILES = [
    { id: 1, name: 'Project_Assets.zip', type: 'archive', size: '1.2 GB', date: 'Oct 24, 2026', icon: Archive },
    { id: 2, name: 'Vacation_Vlog_Final.mp4', type: 'video', size: '4.5 GB', date: 'Oct 23, 2026', icon: Film },
    { id: 3, name: 'Financial_Report_Q3.pdf', type: 'document', size: '2.4 MB', date: 'Oct 21, 2026', icon: FileText },
    { id: 4, name: 'Background_Music.mp3', type: 'audio', size: '8.1 MB', date: 'Oct 20, 2026', icon: Music },
    { id: 5, name: 'Profile_Picture.png', type: 'image', size: '4.2 MB', date: 'Oct 19, 2026', icon: Image },
    { id: 6, name: 'Source_Code_Backup.tar.gz', type: 'code', size: '850 MB', date: 'Oct 18, 2026', icon: Code },
    { id: 7, name: 'Meeting_Recording.mp4', type: 'video', size: '1.8 GB', date: 'Oct 15, 2026', icon: Film },
    { id: 8, name: 'Design_Mockups.fig', type: 'document', size: '145 MB', date: 'Oct 12, 2026', icon: FileText },
];

const YTVaultDashboard = () => {
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

            {/* 1. Left Sidebar: Account Switcher */}
            <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 z-20">
                {/* Top: Owner Avatar */}
                <div className="relative mb-8 cursor-pointer group">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <img src={DUMMY_MEMBERS[0].avatar} alt="Owner" className="relative w-12 h-12 rounded-full border-2 border-blue-500" />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
                </div>

                <div className="w-10 h-px bg-slate-200 mb-6"></div>

                {/* Middle: Scrollable Member List */}
                <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-6 no-scrollbar pb-6">
                    {DUMMY_MEMBERS.slice(1).map(member => (
                        <div key={member.id} className="relative cursor-pointer group" title={`${member.name} - ${member.quota}% used`}>
                            {/* SVG Ring for Quota */}
                            <svg className="absolute -inset-1 w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-slate-800"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className={member.quota > 90 ? "text-red-500" : member.quota > 70 ? "text-amber-500" : "text-blue-500"}
                                    strokeDasharray={`${member.quota}, 100`}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all duration-300" />
                            {/* Status Dot */}
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full flex items-center justify-center ${member.connected ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                {member.connected ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <XCircle className="w-2.5 h-2.5 text-white" />}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom: Invite Button */}
                <div className="mt-auto pt-6 border-t border-slate-200 w-full flex justify-center">
                    <button className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" title="Invite Member">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </aside>

            {/* 2. Middle Pane: File Navigation */}
            <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-10">
                {/* Search */}
                <div className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search Vault..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400 text-slate-900 shadow-sm"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-1">
                    <div className="mb-4 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Views</div>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-600/15 text-blue-500 transition-colors">
                        <HardDrive className="w-5 h-5" /> All Files
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors">
                        <Film className="w-5 h-5" /> Videos
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors">
                        <Image className="w-5 h-5" /> Images
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors">
                        <FileText className="w-5 h-5" /> PDFs / Documents
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors">
                        <Music className="w-5 h-5" /> Audio
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors">
                        <Archive className="w-5 h-5" /> Code / Archives
                    </button>
                </nav>

                {/* Storage Summary Widget */}
                <div className="p-6 border-t border-slate-200">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Vault Capacity</span>
                            <PlaySquare className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full w-3/4"></div>
                        </div>
                        <p className="text-xs text-slate-500"><span className="text-slate-800 font-semibold">12.4 GB</span> used across 6 linked accounts</p>
                    </div>
                </div>
            </aside>

            {/* 3. Right Pane: Main Canvas */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">

                {/* Header */}
                <header className="h-20 px-8 flex items-center justify-between bg-white border-b border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Viewing: All Files</h1>
                        <p className="text-sm text-slate-500 font-medium">8 items stored securely</p>
                    </div>

                    <button className="flex items-center gap-3 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-slate-700">Vedant Magarde</p>
                            <p className="text-xs text-slate-500">Owner</p>
                        </div>
                        <img src={DUMMY_MEMBERS[0].avatar} alt="Profile" className="w-9 h-9 rounded-full border border-slate-200" />
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                </header>

                {/* Action Bar */}
                <div className="px-8 py-6 flex items-center gap-4 bg-white border-b border-slate-100">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm shadow-blue-500/20 transition-all active:scale-95">
                        <UploadCloud className="w-5 h-5" />
                        Upload File
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-medium transition-all active:scale-95">
                        <FolderPlus className="w-5 h-5 text-slate-500" />
                        New Folder
                    </button>
                </div>

                {/* File Grid */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {DUMMY_FILES.map(file => {
                            const Icon = file.icon;
                            return (
                                <div key={file.id} className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col">

                                    {/* Icon / Thumbnail Area */}
                                    <div className="h-32 bg-slate-50 rounded-lg border border-slate-100 mb-4 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                        <Icon className="w-12 h-12 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-slate-800 truncate mb-1" title={file.name}>{file.name}</h3>
                                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                            <span>{file.size}</span>
                                            <span>{file.date}</span>
                                        </div>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all" title="Download">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button className="w-10 h-10 bg-white hover:bg-red-50 text-red-500 border border-slate-200 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Floating Job Queue Overlay */}
                <div className="absolute bottom-8 right-8 w-80 bg-white rounded-xl shadow-2xl shadow-slate-300/50 border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-500">
                    <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            Active Uploads (1)
                        </h4>
                    </div>
                    <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <Film className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">vacation.mp4</p>
                                    <p className="text-xs text-slate-500">Uploading to YouTube... 45%</p>
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div className="bg-blue-500 h-1.5 rounded-full w-[45%] transition-all duration-1000 ease-in-out"></div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default YTVaultDashboard;
