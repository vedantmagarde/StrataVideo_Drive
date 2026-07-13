import React from 'react';
import { Download, Trash2, File, Image, Film, Music, FileText, Archive, Code } from 'lucide-react';

const YoutubeIcon = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className}
    >
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
);

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getIconInfo = (mimeType) => {
    if (!mimeType) return { icon: File, color: 'text-slate-400', bg: 'bg-slate-100' };
    if (mimeType.startsWith('image/')) return { icon: Image, color: 'text-pink-500', bg: 'bg-pink-50' };
    if (mimeType.startsWith('video/')) return { icon: Film, color: 'text-purple-500', bg: 'bg-purple-50' };
    if (mimeType.startsWith('audio/')) return { icon: Music, color: 'text-yellow-500', bg: 'bg-yellow-50' };
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return { icon: Archive, color: 'text-orange-500', bg: 'bg-orange-50' };
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html')) return { icon: Code, color: 'text-emerald-500', bg: 'bg-emerald-50' };
    return { icon: File, color: 'text-slate-400', bg: 'bg-slate-100' };
};

const getStatusBadge = (status) => {
    if (status === 'ready') return null; // HIDDEN WHEN READY
    const styles = {
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        processing: 'bg-blue-100 text-blue-700 border-blue-200',
        failed: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${styles[status] || styles.pending} uppercase tracking-wider font-bold shadow-sm`}>
            {status}
        </span>
    );
};

const FileCard = ({ file, onDelete, onDownload }) => {
    const { icon: Icon, color, bg } = getIconInfo(file.mimeType);

    return (
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 group shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-slate-200 overflow-hidden flex flex-col justify-between aspect-[4/3] min-h-[160px]">
            {/* Subtle Gradient Background on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

            <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-xl ${bg} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
                    <Icon className={`w-6 h-6 ${color}`} strokeWidth={2.5} />
                </div>
                
                <div className="flex gap-1 items-center">
                    {file.uploadMethod === 'direct' && file.youtubeVideoId && (
                        <a 
                            href={`https://youtu.be/${file.youtubeVideoId}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#FF0000] opacity-80 hover:opacity-100 transition-all hover:scale-110 drop-shadow-sm mr-1"
                            title="Stream on YouTube"
                        >
                            <YoutubeIcon className="w-7 h-7" />
                        </a>
                    )}

                    {/* Action Icons - Always visible, slightly faded until hovered */}
                    <div className="flex gap-1 transition-opacity duration-300">
                        <button 
                            onClick={onDownload}
                            disabled={file.status !== 'ready'}
                            className="p-1.5 text-slate-400 opacity-80 hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download"
                        >
                            <Download className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button 
                            onClick={onDelete}
                            className="p-1.5 text-slate-400 opacity-80 hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete"
                        >
                            <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </div>

                    {getStatusBadge(file.status)}
                </div>
            </div>
            
            <div className="mt-auto">
                <h3 className="font-bold text-slate-800 truncate mb-1.5 text-[15px] tracking-tight group-hover:text-blue-600 transition-colors" title={file.filename}>
                    {file.filename}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">{formatBytes(file.sizeBytes)}</span>
                    <span>{new Date(file.uploadedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
            </div>

        </div>
    );
};

export default FileCard;
