import React from 'react';
import { AlertCircle, Check, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConnectionWarningModal = ({ isOpen, onClose, members = [] }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const connectedCount = members.filter(m => m.youtube?.connected).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Action Required</h2>
                    </div>
                    <p className="text-slate-600 text-sm mt-2">
                        Automated Quota Balancing requires at least <strong>2 connected YouTube accounts</strong> to function. 
                        Currently, you have <strong>{connectedCount}</strong> connected.
                    </p>
                </div>

                <div className="p-6 bg-slate-50 max-h-64 overflow-y-auto">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Group Members Status</h3>
                    <div className="space-y-3">
                        {members.map(member => (
                            <div key={member._id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={member.photoURL || `https://ui-avatars.com/api/?name=${member.email}`} 
                                        className="w-8 h-8 rounded-full" 
                                        alt="" 
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{member.displayName || member.email.split('@')[0]}</div>
                                        <div className="text-xs text-slate-500">{member.email}</div>
                                    </div>
                                </div>
                                <div>
                                    {member.youtube?.connected ? (
                                        <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                            <Check className="w-3 h-3" /> Connected
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                                            <X className="w-3 h-3" /> Disconnected
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={() => {
                            onClose();
                            navigate('/settings');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Go to Settings to Connect
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConnectionWarningModal;
