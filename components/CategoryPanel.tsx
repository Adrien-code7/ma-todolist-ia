import React, { useState } from 'react';
import { Category } from '../types';
import { PlusIcon, Trash2Icon, getIcon, ICON_MAP, Undo2Icon } from './icons';

interface CategoryPanelProps {
    categories: Category[];
    activeCategoryId: string | null;
    onSelectCategory: (id: string) => void;
    onAddCategory: (name: string, icon: string) => void;
    onDeleteCategory: (id: string) => void;
    onUndo: () => void;
    isUndoable: boolean;
}

const CategoryPanel: React.FC<CategoryPanelProps> = ({ categories, activeCategoryId, onSelectCategory, onAddCategory, onDeleteCategory, onUndo, isUndoable }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    const IconKeys = Object.keys(ICON_MAP).filter(k => k !== 'Default');
    const [selectedIcon, setSelectedIcon] = useState(IconKeys[0]);

    const handleAddClick = () => {
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName.trim(), selectedIcon);
            setNewCategoryName('');
            setIsAdding(false);
        }
    };

    return (
        <div className="p-3 flex flex-col h-full">
            <div className="flex justify-between items-center mb-3 px-2">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Catégories</h2>
                <button
                    onClick={onUndo}
                    disabled={!isUndoable}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-slate-200 dark:hover:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Annuler la dernière action"
                >
                    <Undo2Icon className="w-5 h-5" />
                </button>
            </div>
            <nav className="flex-grow space-y-2">
                {categories.map(category => (
                    <div key={category.id} className="group relative">
                        <button
                            onClick={() => onSelectCategory(category.id)}
                            className={`flex w-full items-center p-3 rounded-lg text-left transition-all duration-200 text-sm font-medium ${
                                activeCategoryId === category.id 
                                ? 'bg-indigo-600 text-white shadow' 
                                : 'bg-transparent hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            {React.createElement(getIcon(category.icon), { className: "w-5 h-5 mr-3 flex-shrink-0" })}
                            <span className="truncate flex-grow">{category.name}</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }}
                            className="absolute top-1/2 -translate-y-1/2 right-2 z-10 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 hover:scale-90"
                            aria-label={`Supprimer ${category.name}`}
                        >
                            <Trash2Icon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </nav>
            <div className="mt-4 flex-shrink-0">
                 <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center p-3 rounded-lg text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                    aria-label="Ajouter une catégorie"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    <span>Nouvelle catégorie</span>
                </button>
            </div>

            {isAdding && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Ajouter une catégorie</h3>
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nom de la nouvelle catégorie"
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddClick()}
                        />
                        <div className="grid grid-cols-5 gap-2 my-4">
                            {IconKeys.map(iconName => {
                                 const IconComponent = getIcon(iconName);
                                 return (
                                    <button key={iconName} onClick={() => setSelectedIcon(iconName)} className={`p-3 rounded-lg flex justify-center items-center transition-colors ${selectedIcon === iconName ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600'}`}>
                                        <IconComponent className="w-5 h-5" />
                                    </button>
                                 )
                            })}
                        </div>
                        <div className="flex justify-end mt-2 space-x-4">
                             <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300">Annuler</button>
                             <button onClick={handleAddClick} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Ajouter</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default CategoryPanel;