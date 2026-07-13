import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { HardDrive, Settings, Image, Film, Music, FileText, Archive, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StrataVideoIcon } from './StrataVideoIcon';

const Sidebar = ({ activeCategory, setActiveCategory, setCurrentFolderId, groupMembers = [] }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
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
                <div className="flex items-center space-x-3">
                    <StrataVideoIcon className="w-8 h-8" />
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        StrataVideo Drive
                    </h1>
                </div>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navItems.map((item, idx) => (
                    <button 
                        key={idx}
                        onClick={() => {
                            if (location.pathname !== '/dashboard') {
                                navigate('/dashboard', { state: { category: item.type } });
                            } else {
                                if (setActiveCategory) setActiveCategory(item.type);
                                if (setCurrentFolderId && item.type === null) {
                                    setCurrentFolderId(null);
                                }
                            }
                        }}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${(activeCategory === item.type && location.pathname === '/dashboard')
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                        `}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-200 mt-auto">
                <NavLink 
                    to="/settings"
                    className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                >
                    <Settings className="w-5 h-5" />
                    Manage Accounts
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;
