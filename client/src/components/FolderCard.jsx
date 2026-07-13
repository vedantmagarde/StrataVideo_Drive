import React, { useState } from 'react';
import { Folder, Trash2, Edit2, Check, X, FolderOpen } from 'lucide-react';

const FolderCard = ({ folder, onClick, onDelete, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(folder.name);

    const handleRenameSubmit = () => {
        if (editName.trim() && editName !== folder.name) {
            onRename(editName);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleRenameSubmit();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(folder.name);
        }
    };

    return (
        <div 
            className="relative bg-amber-100 rounded-2xl p-5 border border-amber-300 transition-all duration-300 group shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-amber-400 cursor-pointer flex flex-col justify-between aspect-[4/3] min-h-[160px] overflow-hidden"
            onClick={!isEditing ? onClick : undefined}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-200 rounded-xl group-hover:bg-amber-500 transition-all duration-300 shadow-sm group-hover:shadow-amber-500/25 group-hover:scale-110">
                    <Folder className="w-7 h-7 text-amber-600 group-hover:text-white fill-amber-600/20 group-hover:fill-amber-400 transition-colors" strokeWidth={2.5} />
                </div>
                
                <div className="flex gap-1 transition-all duration-300">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="p-1.5 text-slate-400 opacity-80 hover:opacity-100 hover:text-amber-600 hover:bg-amber-100 rounded-xl transition-all"
                        title="Rename"
                    >
                        <Edit2 className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 text-slate-400 opacity-80 hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete"
                    >
                        <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
            
            <div className="mt-auto">
                {isEditing ? (
                    <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
                        <input 
                            type="text"
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-1.5 text-sm font-bold border-2 border-amber-500 rounded-lg focus:outline-none bg-white shadow-inner text-slate-800"
                        />
                        <button onClick={handleRenameSubmit} className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded-lg shadow-sm"><Check className="w-4 h-4" strokeWidth={3} /></button>
                        <button onClick={() => { setIsEditing(false); setEditName(folder.name); }} className="text-slate-500 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg shadow-sm"><X className="w-4 h-4" strokeWidth={3} /></button>
                    </div>
                ) : (
                    <h3 className="font-bold text-slate-800 truncate mb-1.5 text-[15px] tracking-tight group-hover:text-amber-600 transition-colors" title={folder.name}>
                        {folder.name}
                    </h3>
                )}
                
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity text-amber-600 font-bold">
                        Open <FolderOpen className="w-3.5 h-3.5" />
                    </span>
                    <span>{new Date(folder.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
            </div>
        </div>
    );
};

export default FolderCard;
