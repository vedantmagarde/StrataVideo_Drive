import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Layers, HardDrive, Zap, Network, Lock } from 'lucide-react';
import { StrataVideoIcon } from '../components/StrataVideoIcon';

const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="flex flex-col items-start p-6 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/80 transition-all duration-300">
        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl mb-4">
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
);

const LoginPage = () => {
    const { signIn, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);

    const handleLogin = async () => {
        try {
            await signIn();
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 w-full max-w-7xl mx-auto">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <StrataVideoIcon className="w-8 h-8 text-indigo-400" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">StrataVideo<span className="text-indigo-400">Drive</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <a href="https://github.com/vedantmagarde/StrataVideo_Drive" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        GitHub
                    </a>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 w-full max-w-7xl mx-auto py-12 lg:py-24">
                
                {/* Hero Section */}
                <div className="text-center max-w-4xl mx-auto mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
                        <Zap className="w-4 h-4" />
                        <span>Built with Node.js, React, & FFmpeg</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
                        Infinite Cloud Storage <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Powered by YouTube.
                        </span>
                    </h1>
                    
                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                        StrataVideo Drive leverages YouTube's unlimited video hosting as a distributed, encrypted file system. Engineered to bypass datacenter limits using an advanced hybrid architecture.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button 
                            onClick={handleLogin}
                            className="group relative flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] transform hover:-translate-y-1"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                            <div className="absolute inset-0 border-2 border-white rounded-xl scale-[1.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    <FeatureCard 
                        icon={Shield}
                        title="AES-256 Encryption"
                        description="Every file is heavily encrypted client-side before being converted to pixel data. Zero-knowledge architecture ensures YouTube cannot analyze or flag the underlying binary."
                    />
                    <FeatureCard 
                        icon={Network}
                        title="Distributed Sharding"
                        description="Files are split into mathematically perfect chunks and distributed across a network of connected YouTube channels to bypass quota limits and prevent single points of failure."
                    />
                    <FeatureCard 
                        icon={Layers}
                        title="Reed-Solomon ECC"
                        description="Engineered with advanced error correction. Even if YouTube compresses the video or drops frames, mathematical parity chunks allow perfect 1:1 reconstruction of the original file."
                    />
                    <FeatureCard 
                        icon={HardDrive}
                        title="Infinite Capacity"
                        description="By exploiting video hosting infrastructure as a binary data store, the system unlocks theoretically limitless cloud storage without monthly subscription fees."
                    />
                    <FeatureCard 
                        icon={Lock}
                        title="Anti-Bot Bypass"
                        description="Utilizes an injected js-runtime environment and ejs:github solvers within yt-dlp to dynamically resolve YouTube's JavaScript n-challenges and CAPTCHAs."
                    />
                    <FeatureCard 
                        icon={Zap}
                        title="BullMQ Processing"
                        description="Heavy lifting is offloaded to background Node.js worker threads using Redis-backed Bull queues, ensuring the UI remains highly responsive during complex encodings."
                    />
                </div>
            </main>
            
            {/* Footer */}
            <footer className="relative z-10 w-full text-center py-8 text-slate-500 text-sm">
                <p>Engineered by Vedant Magarde. Not affiliated with Google or YouTube.</p>
            </footer>
        </div>
    );
};

export default LoginPage;
