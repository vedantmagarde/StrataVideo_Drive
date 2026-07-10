import React from 'react';
import { Download, Trash2, File, Image, Film, Music, FileText, Archive, Code } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getIcon = (mimeType) => {
    if (!mimeType) return <File className="w-8 h-8 text-slate-400" />;
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-400" />;
    if (mimeType.startsWith('video/')) return <Film className="w-8 h-8 text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-8 h-8 text-yellow-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return <FileText className="w-8 h-8 text-red-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return <Archive className="w-8 h-8 text-orange-400" />;
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html')) return <Code className="w-8 h-8 text-green-400" />;
    return <File className="w-8 h-8 text-slate-400" />;
};

const getStatusBadge = (status) => {
    const styles = {
        pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        ready: 'bg-green-500/10 text-green-500 border-green-500/20',
        failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
        <span className={`text-xs px-2 py-1 rounded-full border ${styles[status] || styles.pending} uppercase tracking-wider font-semibold`}>
            {status}
        </span>
    );
};

const FileCard = ({ file, onDelete, onDownload }) => {
    return (
        <div className="bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 transition-all group shadow-sm hover:shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                    {getIcon(file.mimeType)}
                </div>
                {getStatusBadge(file.status)}
            </div>
            
            <h3 className="font-semibold text-slate-900 truncate mb-1" title={file.filename}>
                {file.filename}
            </h3>
            
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
            </div>

            <div className="mt-5 flex gap-2 pt-4 border-t border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={onDownload}
                    disabled={file.status !== 'ready'}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" /> Download
                </button>
                <button 
                    onClick={onDelete}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default FileCard;
