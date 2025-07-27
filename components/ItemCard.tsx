import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Item } from '../types';
import { Trash2Icon, GripVerticalIcon, CheckIcon, MessageSquareIcon } from './icons';

interface ItemCardProps {
    item: Item;
    isSelected: boolean;
    onToggle: () => void;
    onDelete: () => void;
    onSelect: () => void;
    onUpdateNotes: (notes: string) => void;
    highlightClass: string;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, isSelected, onToggle, onDelete, onSelect, onUpdateNotes, highlightClass }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const [notesContent, setNotesContent] = useState(item.notes || '');

    useEffect(() => {
        if (!isSelected) {
            setNotesContent(item.notes || '');
        }
    }, [isSelected, item.notes]);

    const handleNotesBlur = () => {
        if (notesContent !== item.notes) {
            onUpdateNotes(notesContent);
        }
    };
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };
    
    return (
        <li ref={setNodeRef} style={style} className={`bg-white dark:bg-gray-800/80 rounded-lg shadow-sm group transition-shadow hover:shadow-md ${highlightClass}`}>
            <div className="flex items-center p-3">
                <button {...attributes} {...listeners} className="p-2 cursor-grab touch-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <GripVerticalIcon className="w-5 h-5" />
                </button>
                <button onClick={onToggle} className={`w-6 h-6 mr-3 flex-shrink-0 border-2 rounded-md flex items-center justify-center transition-colors ${
                    item.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                }`}>
                    {item.completed && <CheckIcon className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-grow">
                    <span className={`transition-colors ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                        {item.content}
                    </span>
                    {item.dueDate && (
                        <p className={`text-xs mt-1 ${item.completed ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                            Échéance: {new Date(item.dueDate).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onSelect}
                        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${item.notes ? 'text-indigo-500' : 'text-gray-400'}`}
                        aria-label="Afficher les notes"
                    >
                        <MessageSquareIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label={`Supprimer ${item.content}`}
                    >
                        <Trash2Icon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {isSelected && (
                <div className="px-4 pb-3 -mt-2">
                     <textarea
                        value={notesContent}
                        onChange={(e) => setNotesContent(e.target.value)}
                        onBlur={handleNotesBlur}
                        placeholder="Ajouter une note..."
                        className="w-full p-2 border rounded-md text-sm bg-slate-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 transition"
                        rows={2}
                    />
                </div>
            )}
        </li>
    );
};

export default ItemCard;