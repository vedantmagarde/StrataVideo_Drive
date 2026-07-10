import React from 'react';
import { NavLink } from 'react-router-dom';
import { HardDrive, Settings, Image, Film, Music, FileText, Archive, Code } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { currentUser } = useAuth();
    
    const navItems = [
        { icon: <HardDrive className="w-5 h-5" />, label: 'All Files', path: '/dashboard' },
        { icon: <Image className="w-5 h-5" />, label: 'Images', path: '/dashboard?type=image' },
        { icon: <Film className="w-5 h-5" />, label: 'Videos', path: '/dashboard?type=video' },
        { icon: <Music className="w-5 h-5" />, label: 'Audio', path: '/dashboard?type=audio' },
        { icon: <FileText className="w-5 h-5" />, label: 'Documents', path: '/dashboard?type=document' },
        { icon: <Archive className="w-5 h-5" />, label: 'Archives', path: '/dashboard?type=archive' },
        { icon: <Code className="w-5 h-5" />, label: 'Code', path: '/dashboard?type=code' },
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
                    <NavLink 
                        key={idx}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${isActive && !item.path.includes('?type=') || window.location.search === item.path.split('?')[1] 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                        `}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
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

                <div className="flex items-center gap-3 px-3 pt-4 border-t border-slate-200">
                    <img 
                        src={currentUser.backendProfile?.photoURL || currentUser.photoURL} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{currentUser.backendProfile?.displayName || currentUser.displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.backendProfile?.email || currentUser.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
