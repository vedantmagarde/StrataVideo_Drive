import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { PlaySquare, LogOut, Plus, RefreshCw } from 'lucide-react';

const SettingsPage = () => {
    const { currentUser, signOut, signIn } = useAuth();
    const [members, setMembers] = useState([]);

    const fetchMembers = async () => {
        try {
            if (currentUser.backendProfile?.groupId) {
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

    const handleConnectEmail = async () => {
        try {
            if (members.length >= 10) {
                return alert("Maximum limit of 10 connected emails reached.");
            }
            const res = await api.post('/group/generate-invite');
            localStorage.setItem('inviteCode', res.data.inviteCode);
            await signIn({ prompt: 'select_account' });
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const handleSwitchAccount = async (email) => {
        if (email === currentUser.backendProfile?.email) return;
        try {
            await signIn({ emailHint: email });
        } catch (error) {
            console.error("Error switching account:", error);
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

    const profile = currentUser.backendProfile || currentUser;

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900">
            <Sidebar />

            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">

                    <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={profile.photoURL} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-slate-200" />
                                <div>
                                    <h2 className="text-xl font-bold">{profile.displayName}</h2>
                                    <p className="text-slate-500">{profile.email}</p>
                                </div>
                            </div>
                            <button onClick={signOut} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <h3 className="text-lg font-semibold mb-4">YouTube Storage Connection</h3>
                            {profile.youtube?.connected ? (
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <PlaySquare className="w-6 h-6 text-red-500" />
                                        <div>
                                            <p className="font-medium">{profile.youtube.channelName}</p>
                                            <p className="text-sm text-slate-500">Quota Used: {profile.youtube.quotaUsed} / 10000</p>
                                        </div>
                                    </div>
                                    <button onClick={handleDisconnectYoutube} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors border border-slate-300">
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleConnectYoutube} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                    <PlaySquare className="w-5 h-5" />
                                    Connect YouTube Account
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold">Connected Email IDs</h3>
                                <p className="text-sm text-slate-500">Manage multiple accounts to expand your YouTube storage quota ({members.length}/10)</p>
                            </div>
                            <button
                                onClick={handleConnectEmail}
                                disabled={members.length >= 10}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Connect Email
                            </button>
                        </div>

                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.email} className={`flex items-center justify-between p-4 rounded-lg border ${member.email === profile.email ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-4">
                                        <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`} alt="Avatar" className="w-10 h-10 rounded-full bg-slate-200" />
                                        <div>
                                            <p className="font-medium flex items-center gap-2">
                                                {member.displayName || member.email.split('@')[0]}
                                                {member.email === profile.email && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Current</span>}
                                            </p>
                                            <p className="text-sm text-slate-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {member.youtube?.connected ? (
                                            <span className="text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full flex items-center gap-1">
                                                <PlaySquare className="w-3 h-3" /> Connected
                                            </span>
                                        ) : (
                                            <span className="text-sm text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
                                                Not Connected
                                            </span>
                                        )}
                                        {member.email !== profile.email && (
                                            <button
                                                onClick={() => handleSwitchAccount(member.email)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition-colors border border-slate-300"
                                                title="Switch to this account with one click"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Switch & Re-login
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
