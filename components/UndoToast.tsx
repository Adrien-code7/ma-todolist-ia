import React, { useEffect, useState } from 'react';
import { UndoAction } from '../types';
import { Undo2Icon } from './icons';

interface UndoToastProps {
    undoAction: UndoAction | null;
    onUndo: () => void;
}

const UndoToast: React.FC<UndoToastProps> = ({ undoAction, onUndo }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (undoAction) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 5000); // Hide after 5 seconds
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [undoAction]);

    if (!visible || !undoAction) {
        return null;
    }
    
    let message = 'Action effectuée.';
    switch(undoAction.type) {
        case 'ITEM_DELETE':
            message = `Élément "${undoAction.payload.item.content}" supprimé.`;
            break;
        case 'ITEM_ADD':
            message = `Élément ajouté.`;
            break;
        case 'CATEGORY_DELETE':
            message = `Catégorie "${undoAction.payload.category.name}" supprimée.`;
            break;
        case 'CATEGORY_ADD':
            message = `Catégorie ajoutée.`;
            break;
        case 'ITEM_TOGGLE':
            message = 'Élément mis à jour.';
            break;
        case 'ITEM_NOTES_UPDATE':
            message = 'Note mise à jour.';
            break;
        case 'ITEM_DRAG':
            message = 'Élément déplacé.';
            break;
    }


    return (
        <div className="fixed bottom-24 right-4 sm:bottom-[calc(30vh+1rem)] md:bottom-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg flex items-center space-x-4 z-50 animate-fade-in-up">
            <span>{message}</span>
            <button
                onClick={() => {
                    onUndo();
                    setVisible(false);
                }}
                className="flex items-center font-semibold text-indigo-300 hover:text-indigo-200"
            >
                <Undo2Icon className="w-5 h-5 mr-1" />
                Annuler
            </button>
        </div>
    );
};

export default UndoToast;
