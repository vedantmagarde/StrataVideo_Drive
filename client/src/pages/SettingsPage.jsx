import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import MemberTable from '../components/MemberTable';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Youtube, LogOut } from 'lucide-react';

const SettingsPage = () => {
    const { currentUser, signOut } = useAuth();
    const [members, setMembers] = useState([]);
    const [groupInput, setGroupInput] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');

    const fetchMembers = async () => {
        try {
            if (currentUser.backendProfile.groupId) {
                const res = await api.get('/group/members');
                setMembers(res.data.members);
            }
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [currentUser]);

    const handleCreateGroup = async () => {
        if (!groupInput) return;
        try {
            await api.post('/group/create', { name: groupInput });
            window.location.reload(); 
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail) return;
        try {
            await api.post('/group/invite', { emailToInvite: inviteEmail });
            setInviteEmail('');
            alert("Invite sent/linked successfully!");
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const handleConnectYoutube = async () => {
        try {
            const res = await api.get('/youtube/auth');
            window.location.href = res.data.url;
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const handleDisconnectYoutube = async () => {
        try {
            await api.post('/youtube/disconnect');
            window.location.reload();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const profile = currentUser.backendProfile;

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100">
            <Sidebar />
            
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {}
                    <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={profile.photoURL} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-slate-600" />
                                <div>
                                    <h2 className="text-xl font-bold">{profile.displayName}</h2>
                                    <p className="text-slate-400">{profile.email}</p>
                                </div>
                            </div>
                            <button onClick={signOut} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-700">
                            <h3 className="text-lg font-semibold mb-4">YouTube Storage Connection</h3>
                            {profile.youtube?.connected ? (
                                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <Youtube className="w-6 h-6 text-red-500" />
                                        <div>
                                            <p className="font-medium">{profile.youtube.channelName}</p>
                                            <p className="text-sm text-slate-400">Quota Used: {profile.youtube.quotaUsed} / 10000</p>
                                        </div>
                                    </div>
                                    <button onClick={handleDisconnectYoutube} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleConnectYoutube} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                    <Youtube className="w-5 h-5" />
                                    Connect YouTube Account
                                </button>
                            )}
                        </div>
                    </section>

                    {}
                    <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-lg font-semibold mb-6">Group Management</h3>
                        
                        {!profile.groupId ? (
                            <div className="flex gap-4">
                                <input 
                                    type="text" 
                                    placeholder="New Group Name" 
                                    value={groupInput}
                                    onChange={e => setGroupInput(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                />
                                <button onClick={handleCreateGroup} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
                                    Create Group
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {profile.role === 'owner' && (
                                    <div className="flex gap-4">
                                        <input 
                                            type="email" 
                                            placeholder="Invite Email Address" 
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                        />
                                        <button onClick={handleInvite} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">
                                            Invite Member
                                        </button>
                                    </div>
                                )}
                                
                                <MemberTable 
                                    members={members} 
                                    isOwner={profile.role === 'owner'}
                                    onMemberRemoved={fetchMembers}
                                />
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
