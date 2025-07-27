import React, { useState, useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Category } from '../types';
import ItemCard from './ItemCard';
import { PlusIcon, SearchIcon, getIcon } from './icons';
import { isAfter, isToday, addDays } from 'date-fns';

interface ItemListPanelProps {
    category: Category;
    selectedItemId: string | null;
    onAddItem: (content: string, dueDate?: string) => void;
    onToggleItem: (itemId: string) => void;
    onDeleteItem: (itemId: string) => void;
    onSelectItem: (itemId: string) => void;
    onUpdateItemNotes: (itemId: string, notes: string) => void;
}

const ItemListPanel: React.FC<ItemListPanelProps> = ({ category, selectedItemId, onAddItem, onToggleItem, onDeleteItem, onSelectItem, onUpdateItemNotes }) => {
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemDueDate, setNewItemDueDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const filteredItems = useMemo(() => 
        category.items.filter(item => 
            item.content.toLowerCase().includes(searchTerm.toLowerCase())
        ), [category.items, searchTerm]);

    const handleAddClick = () => {
        if (newItemContent.trim()) {
            onAddItem(newItemContent.trim(), newItemDueDate || undefined);
            setNewItemContent('');
            setNewItemDueDate('');
            setIsAdding(false);
        }
    };
    
    const isToDoCategory = category.name.toLowerCase().includes('faire');

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                 <div className="flex items-center">
                    {React.createElement(getIcon(category.icon), { className: "w-8 h-8 mr-3 text-indigo-500" })}
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{category.name}</h2>
                </div>
                <div className="relative w-full sm:w-1/2 md:w-1/3">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    <input 
                        type="text"
                        placeholder="Rechercher des éléments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 border rounded-full bg-slate-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {filteredItems.length > 0 ? (
                        <ul className="space-y-3">
                            {filteredItems.map(item => {
                                let highlightClass = '';
                                if (item.dueDate && !item.completed) {
                                    const dueDate = new Date(item.dueDate);
                                    if (isToday(dueDate)) {
                                        highlightClass = 'border-l-4 border-red-500';
                                    } else if (isAfter(addDays(new Date(), 1), dueDate)) {
                                        highlightClass = 'border-l-4 border-yellow-500';
                                    }
                                }
                                return (
                                    <ItemCard 
                                        key={item.id} 
                                        item={item}
                                        isSelected={selectedItemId === item.id}
                                        onToggle={() => onToggleItem(item.id)}
                                        onDelete={() => onDeleteItem(item.id)}
                                        onSelect={() => onSelectItem(item.id)}
                                        onUpdateNotes={(notes) => onUpdateItemNotes(item.id, notes)}
                                        highlightClass={highlightClass}
                                    />
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 mt-8">Aucun élément ici. Ajoutez-en un !</p>
                    )}
                </SortableContext>
            </div>
            
            <div className="mt-4 flex-shrink-0">
                {isAdding ? (
                     <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <input
                            type="text"
                            value={newItemContent}
                            onChange={(e) => setNewItemContent(e.target.value)}
                            placeholder="Description du nouvel élément"
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddClick()}
                        />
                         {isToDoCategory && (
                            <input
                                type="date"
                                value={newItemDueDate}
                                onChange={(e) => setNewItemDueDate(e.target.value)}
                                className="w-full mt-2 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            />
                         )}
                        <div className="flex justify-end mt-2 space-x-2">
                            <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-sm rounded bg-gray-300 dark:bg-gray-600 hover:bg-gray-400">Annuler</button>
                            <button onClick={handleAddClick} className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">Ajouter</button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full flex items-center justify-center p-3 rounded-lg text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        <span>Ajouter un élément</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ItemListPanel;