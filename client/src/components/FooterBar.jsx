import React from 'react';
import { useAuth } from '../context/AuthContext';

const FooterBar = ({ groupMembers = [] }) => {
    const { currentUser } = useAuth();
    
    // Filter out the primary (current) user from the rest of the group members
    const otherMembers = groupMembers.filter(m => m.email !== (currentUser.backendProfile?.email || currentUser.email));

    return (
        <footer className="h-14 border-t border-slate-200 bg-white flex shrink-0 z-50 relative">
            {/* Left Part: Highlighted Primary Account (Matches Sidebar Width w-64) */}
            <div className="w-64 border-r border-slate-200 bg-blue-50 px-4 py-2 flex items-center justify-between shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3 min-w-0">
                    <img 
                        src={currentUser.backendProfile?.photoURL || currentUser.photoURL} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full border-2 border-blue-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold text-blue-700 truncate leading-tight">{currentUser.backendProfile?.displayName || currentUser.displayName}</p>
                        <p className="text-[10px] font-medium text-blue-500/80 truncate uppercase tracking-wider">
                            {currentUser.backendProfile?.youtube?.connected 
                                ? `Quota: ${currentUser.backendProfile.youtube.quotaUsed?.toLocaleString() || 0}`
                                : 'Primary Account'}
                        </p>
                    </div>
                </div>
                {currentUser.backendProfile?.youtube?.connected ? (
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] flex-shrink-0 ml-2" title="Connected"></div>
                ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0 ml-2" title="Disconnected"></div>
                )}
            </div>

            {/* Right Part: Equal Width Divisions for Other Accounts */}
            <div className="flex-1 flex overflow-hidden bg-slate-50/50">
                {otherMembers.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-3 text-sm text-slate-400 font-medium">
                        No other connected accounts in this group yet.
                    </div>
                ) : (
                    otherMembers.map((member) => (
                        <div 
                            key={member._id || member.email} 
                            className="flex-1 flex items-center justify-center p-2 border-r last:border-r-0 border-slate-200 hover:bg-slate-100 transition-colors min-w-[120px]"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <img 
                                    src={member.photoURL || `https://ui-avatars.com/api/?name=${member.email}`} 
                                    className="w-8 h-8 rounded-full shadow-sm bg-white" 
                                    alt="" 
                                />
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium text-slate-700 truncate leading-tight">
                                        {member.displayName || member.email.split('@')[0]}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider font-semibold">
                                        {member.youtube?.connected ? `Quota: ${member.youtube.quotaUsed?.toLocaleString() || 0}` : 'Disconnected'}
                                    </p>
                                </div>
                                {member.youtube?.connected ? (
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] flex-shrink-0 ml-1" title="Connected"></div>
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0 ml-1" title="Disconnected"></div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </footer>
    );
};

export default FooterBar;
