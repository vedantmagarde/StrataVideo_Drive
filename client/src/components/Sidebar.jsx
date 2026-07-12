import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { HardDrive, Settings, Image, Film, Music, FileText, Archive, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ activeCategory, setActiveCategory, setCurrentFolderId, groupMembers = [] }) => {
    const { currentUser } = useAuth();
    const [isMembersExpanded, setIsMembersExpanded] = useState(false);
    
    const navItems = [
        { icon: <HardDrive className="w-5 h-5" />, label: 'All Files', type: null },
        { icon: <Image className="w-5 h-5" />, label: 'Images', type: 'image' },
        { icon: <Film className="w-5 h-5" />, label: 'Videos', type: 'video' },
        { icon: <Music className="w-5 h-5" />, label: 'Audio', type: 'audio' },
        { icon: <FileText className="w-5 h-5" />, label: 'Documents', type: 'document' },
        { icon: <Archive className="w-5 h-5" />, label: 'Archives', type: 'archive' },
        { icon: <Code className="w-5 h-5" />, label: 'Code', type: 'code' },
    ];

    return (
        <aside className="w-64 border-r border-slate-200 bg-white/50 backdrop-blur flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
                <span className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-sm text-white">S</span>
                    StrataVideo
                </span>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navItems.map((item, idx) => (
                    <button 
                        key={idx}
                        onClick={() => {
                            setActiveCategory(item.type);
                            if (item.type === null) {
                                setCurrentFolderId(null);
                            }
                        }}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${activeCategory === item.type
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                        `}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-200">
                <NavLink 
                    to="/settings"
                    className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-4
                        ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                >
                    <Settings className="w-5 h-5" />
                    Settings
                </NavLink>

                <div className="flex flex-col border-t border-slate-200 mt-4">
                    {isMembersExpanded && (
                        <div className="px-4 pt-4 pb-2 space-y-2 max-h-48 overflow-y-auto border-b border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-1">Group Channels</div>
                            {groupMembers.length === 0 && (
                                <p className="text-xs text-slate-400">Loading members...</p>
                            )}
                            {groupMembers.map(member => (
                                <div key={member._id} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.email}`} className="w-6 h-6 rounded-full" alt="" />
                                        <span className="text-sm text-slate-700 truncate">{member.displayName || member.email.split('@')[0]}</span>
                                    </div>
                                    {member.youtube?.connected ? (
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] flex-shrink-0 ml-2" title="Connected"></div>
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0 ml-2" title="Disconnected"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setIsMembersExpanded(!isMembersExpanded)}
                        className="flex items-center justify-between w-full p-4 hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <img 
                                src={currentUser.backendProfile?.photoURL || currentUser.photoURL} 
                                alt="Profile" 
                                className="w-8 h-8 rounded-full border border-slate-200"
                            />
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-slate-900 truncate">{currentUser.backendProfile?.displayName || currentUser.displayName}</p>
                                <p className="text-xs text-slate-500 truncate">{currentUser.backendProfile?.email || currentUser.email}</p>
                            </div>
                        </div>
                        {isMembersExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" /> : <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
