import React from 'react';
import { UserMinus, Check, X } from 'lucide-react';
import api from '../api/axios';

const MemberTable = ({ members, isOwner, onMemberRemoved }) => {
    
    const handleRemove = async (email) => {
        if (!confirm(`Are you sure you want to remove ${email}?`)) return;
        try {
            await api.delete('/group/remove', { data: { emailToRemove: email } });
            if (onMemberRemoved) onMemberRemoved();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    return (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
                    <tr>
                        <th className="px-6 py-4 font-medium">Member</th>
                        <th className="px-6 py-4 font-medium">Role</th>
                        <th className="px-6 py-4 font-medium">YouTube Status</th>
                        <th className="px-6 py-4 font-medium w-48">Quota Used</th>
                        {isOwner && <th className="px-6 py-4 font-medium text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                    {members.map((member) => (
                        <tr key={member._id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3">
                                <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.email}`} className="w-8 h-8 rounded-full" alt="" />
                                <div>
                                    <div className="font-medium text-slate-200">{member.displayName || 'Pending User'}</div>
                                    <div className="text-xs text-slate-500">{member.email}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 capitalize">{member.role}</td>
                            <td className="px-6 py-4">
                                {member.youtube?.connected ? (
                                    <span className="flex items-center gap-1 text-green-400"><Check className="w-4 h-4"/> Connected</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-slate-500"><X className="w-4 h-4"/> Disconnected</span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {member.youtube?.connected ? (
                                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                        <div 
                                            className="bg-blue-500 h-2 rounded-full" 
                                            style={{ width: `${Math.min((member.youtube.quotaUsed / 10000) * 100, 100)}%` }}
                                        />
                                    </div>
                                ) : (
                                    <span className="text-slate-600">-</span>
                                )}
                            </td>
                            {isOwner && (
                                <td className="px-6 py-4 text-right">
                                    {member.role !== 'owner' && (
                                        <button 
                                            onClick={() => handleRemove(member.email)}
                                            className="p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MemberTable;
