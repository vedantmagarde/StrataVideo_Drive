import React, { useState } from 'react';
import { Folder, Trash2, Edit2, Check, X } from 'lucide-react';

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
            className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition-all group shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between"
            onClick={!isEditing ? onClick : undefined}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Folder className="w-10 h-10 text-blue-500 fill-blue-500/20" />
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="Rename"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {isEditing ? (
                <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                    <input 
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-2 py-1 text-sm border-b-2 border-blue-500 focus:outline-none bg-transparent"
                    />
                    <button onClick={handleRenameSubmit} className="text-green-500 hover:bg-green-50 p-1 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setIsEditing(false); setEditName(folder.name); }} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X className="w-4 h-4" /></button>
                </div>
            ) : (
                <h3 className="font-semibold text-slate-900 truncate mb-1 mt-2" title={folder.name}>
                    {folder.name}
                </h3>
            )}
            
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
};

export default FolderCard;
