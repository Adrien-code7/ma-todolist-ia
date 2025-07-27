import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Category, Item, ChatMessage, VoiceOption, UndoAction } from './types';
import CategoryPanel from './components/CategoryPanel';
import ItemListPanel from './components/ItemListPanel';
import ChatPanel from './components/ChatPanel';
import ConfirmationDialog from './components/ConfirmationDialog';
import UndoToast from './components/UndoToast';
import { getSystemInstruction, responseSchema } from './services/geminiService';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { getIcon } from './components/icons';

const INITIAL_CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Achats', icon: 'ShoppingCart', items: [
        { id: 'item-1', content: 'Lait', completed: false, notes: 'Lait entier bio' },
        { id: 'item-2', content: 'Pain', completed: false },
    ]},
    { id: 'cat-2', name: 'À Faire', icon: 'ListTodo', items: [
        { id: 'item-3', content: 'Appeler le médecin', completed: false, dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
        { id: 'item-4', content: 'Finir le rapport', completed: true, dueDate: new Date().toISOString().split('T')[0] },
    ]},
    { id: 'cat-3', name: 'Films à voir', icon: 'Clapperboard', items: []},
];

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.log(error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.log(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};


const App: React.FC = () => {
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', INITIAL_CATEGORIES);
    const [activeCategoryId, setActiveCategoryId] = useLocalStorage<string | null>('activeCategoryId', 'cat-1');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
    
    const chatRef = useRef<Chat | null>(null);
    const aiRef = useRef<GoogleGenAI | null>(null);
    
    const activeCategory = useMemo(() => categories.find(c => c.id === activeCategoryId) || null, [categories, activeCategoryId]);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 }}));

    useEffect(() => {
         if (process.env.API_KEY && process.env.API_KEY !== "mock_api_key_for_development") {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
    }, []);

    // Select first category if active one is deleted or on initial load with no selection
    useEffect(() => {
        if (!activeCategoryId || !categories.some(c => c.id === activeCategoryId)) {
            setActiveCategoryId(categories.length > 0 ? categories[0].id : null);
        }
    }, [activeCategoryId, categories, setActiveCategoryId]);

    useEffect(() => {
        if (undoAction) {
            const timer = setTimeout(() => setUndoAction(null), 5100);
            return () => clearTimeout(timer);
        }
    }, [undoAction]);


    const handleAddCategory = (name: string, icon: string) => {
        const newCategory: Category = { id: `cat-${Date.now()}`, name, icon, items: [] };
        setCategories(prev => [...prev, newCategory]);
        setActiveCategoryId(newCategory.id);
        setUndoAction({ type: 'CATEGORY_ADD', payload: { categoryId: newCategory.id } });
    };

    const handleDeleteCategory = (categoryId: string) => {
        const categoryToDelete = categories.find(c => c.id === categoryId);
        if (!categoryToDelete) return;
        const categoryIndex = categories.findIndex(c => c.id === categoryId);

        setCategories(prev => prev.filter(c => c.id !== categoryId));
        if (activeCategoryId === categoryId) {
            const remainingCategories = categories.filter(c => c.id !== categoryId);
            setActiveCategoryId(remainingCategories.length > 0 ? remainingCategories[0].id : null);
        }
        setUndoAction({ type: 'CATEGORY_DELETE', payload: { category: categoryToDelete, index: categoryIndex } });
    };

    const handleAddItem = (categoryId: string, content: string, dueDate?: string) => {
        const newItem: Item = { id: `item-${Date.now()}`, content, completed: false, dueDate };
        setCategories(prev => prev.map(c => 
            c.id === categoryId ? { ...c, items: [...c.items, newItem] } : c
        ));
        setUndoAction({ type: 'ITEM_ADD', payload: { categoryId, itemId: newItem.id } });
    };

    const handleToggleItem = (categoryId: string, itemId: string) => {
        setCategories(prev => prev.map(c => 
            c.id === categoryId 
            ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i) }
            : c
        ));
        setUndoAction({ type: 'ITEM_TOGGLE', payload: { categoryId, itemId } });
    };

    const handleDeleteItem = (categoryId: string, itemId: string) => {
        let deletedItem: Item | undefined;
        let itemIndex = -1;
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            itemIndex = category.items.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                deletedItem = category.items[itemIndex];
            }
        }

        if (deletedItem) {
            setCategories(prev => prev.map(c => 
                c.id === categoryId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
            ));
            setUndoAction({ type: 'ITEM_DELETE', payload: { item: deletedItem, categoryId, index: itemIndex } });
        }
    };

    const handleSelectItem = (itemId: string) => {
        setSelectedItemId(prev => (prev === itemId ? null : itemId));
    };

    const handleUpdateItemNotes = (categoryId: string, itemId: string, notes: string) => {
        let prevNotes = '';
        const category = categories.find(c => c.id === categoryId);
        if(category) {
            const item = category.items.find(i => i.id === itemId);
            if(item) prevNotes = item.notes || '';
        }
        
         setCategories(prev => prev.map(c => 
            c.id === categoryId 
            ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, notes } : i) }
            : c
        ));
        setUndoAction({ type: 'ITEM_NOTES_UPDATE', payload: { categoryId, itemId, prevNotes }});
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        if (!activeCategory) return;
        setSelectedItemId(null); // Close notes on drag

        const oldIndex = activeCategory.items.findIndex(item => item.id === active.id);
        const newIndex = activeCategory.items.findIndex(item => item.id === over.id);

        setCategories(prev => prev.map(c => {
            if (c.id === activeCategoryId) {
                return { ...c, items: arrayMove(c.items, oldIndex, newIndex) };
            }
            return c;
        }));
        setUndoAction({ type: 'ITEM_DRAG', payload: { categoryId: activeCategoryId, oldIndex, newIndex } });
    };
    
    const handleUndo = () => {
        if (!undoAction) return;
    
        switch (undoAction.type) {
            case 'ITEM_ADD':
                setCategories(prev => prev.map(c => 
                    c.id === undoAction.payload.categoryId 
                    ? { ...c, items: c.items.filter(i => i.id !== undoAction.payload.itemId) } 
                    : c
                ));
                break;
            case 'ITEM_DELETE':
                setCategories(prev => prev.map(c => {
                    if (c.id === undoAction.payload.categoryId) {
                        const newItems = [...c.items];
                        newItems.splice(undoAction.payload.index, 0, undoAction.payload.item);
                        return { ...c, items: newItems };
                    }
                    return c;
                }));
                break;
            case 'ITEM_TOGGLE':
                setCategories(prev => prev.map(c => 
                    c.id === undoAction.payload.categoryId 
                    ? { ...c, items: c.items.map(i => i.id === undoAction.payload.itemId ? { ...i, completed: !i.completed } : i) }
                    : c
                ));
                break;
            case 'ITEM_NOTES_UPDATE':
                 setCategories(prev => prev.map(c => 
                    c.id === undoAction.payload.categoryId 
                    ? { ...c, items: c.items.map(i => i.id === undoAction.payload.itemId ? { ...i, notes: undoAction.payload.prevNotes } : i) }
                    : c
                ));
                break;
            case 'ITEM_DRAG':
                 setCategories(prev => prev.map(c => {
                    if (c.id === undoAction.payload.categoryId) {
                        return { ...c, items: arrayMove(c.items, undoAction.payload.newIndex, undoAction.payload.oldIndex) };
                    }
                    return c;
                }));
                break;
            case 'CATEGORY_ADD':
                setCategories(prev => prev.filter(c => c.id !== undoAction.payload.categoryId));
                break;
            case 'CATEGORY_DELETE':
                setCategories(prev => {
                    const newCategories = [...prev];
                    newCategories.splice(undoAction.payload.index, 0, undoAction.payload.category);
                    return newCategories;
                });
                break;
        }
    
        setUndoAction(null);
    };


    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoadingAI) return;

        const userMessage: ChatMessage = { id: `msg-${Date.now()}`, text, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setIsLoadingAI(true);

        if (!aiRef.current) {
            const mockResponse: ChatMessage = { id: `msg-${Date.now() + 1}`, text: "Clé API non configurée. Ceci est une réponse factice.", sender: 'ai' };
            setMessages(prev => [...prev, mockResponse]);
            setIsLoadingAI(false);
            return;
        }
        
        if (!chatRef.current) {
            chatRef.current = aiRef.current.chats.create({ model: 'gemini-2.5-flash' });
        }

        try {
            const systemInstruction = getSystemInstruction(categories, activeCategoryId);
            const response: GenerateContentResponse = await chatRef.current.sendMessage({
                message: text,
                config: { systemInstruction, responseMimeType: 'application/json', responseSchema }
            });

            let jsonStr = response.text.trim().replace(/^```json\s*|```\s*$/g, '');
            const result = JSON.parse(jsonStr);
            
            setUndoAction(null); 

            let newCategories = [...categories];
            switch (result.action) {
                case 'add':
                    result.items?.forEach((itemToAdd: any) => {
                        const targetCategory = newCategories.find((c: Category) => c.name.toLowerCase() === itemToAdd.categoryName.toLowerCase());
                        if (targetCategory) {
                            targetCategory.items.push({ id: `item-${Date.now()}-${Math.random()}`, ...itemToAdd, completed: false });
                        }
                    });
                    break;
                
                case 'update':
                    result.items?.forEach((itemToUpdate: any) => {
                        const targetCategory = newCategories.find((c: Category) => c.name.toLowerCase() === itemToUpdate.categoryName.toLowerCase());
                        if (targetCategory) {
                            const itemIndex = targetCategory.items.findIndex((i: Item) => i.content.toLowerCase() === itemToUpdate.content.toLowerCase());
                            if (itemIndex > -1) {
                                const originalItem = targetCategory.items[itemIndex];
                                targetCategory.items[itemIndex] = {
                                    ...originalItem,
                                    content: itemToUpdate.newContent !== undefined ? itemToUpdate.newContent : originalItem.content,
                                    completed: itemToUpdate.completed !== undefined ? itemToUpdate.completed : originalItem.completed,
                                    dueDate: itemToUpdate.dueDate !== undefined ? itemToUpdate.dueDate : originalItem.dueDate,
                                    notes: itemToUpdate.notes !== undefined ? itemToUpdate.notes : originalItem.notes,
                                };
                            }
                        }
                    });
                    break;
                
                case 'create_category':
                    if (result.category_details) {
                        const { name, icon } = result.category_details;
                        if (name && !newCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                            const newCategory: Category = { id: `cat-${Date.now()}`, name, icon: getIcon(icon) ? icon : 'Default', items: [] };
                            newCategories.push(newCategory);
                            setActiveCategoryId(newCategory.id);
                        }
                    }
                    break;

                case 'rename_category':
                    if (result.category_details) {
                        const { name, newName } = result.category_details;
                        newCategories = newCategories.map((c: Category) => 
                            c.name.toLowerCase() === name.toLowerCase() ? { ...c, name: newName } : c
                        );
                    }
                    break;
                
                case 'delete_category':
                     if (result.category_details) {
                        const { name } = result.category_details;
                        newCategories = newCategories.filter(c => c.name.toLowerCase() !== name.toLowerCase());
                        if (activeCategory?.name.toLowerCase() === name.toLowerCase()) {
                           setActiveCategoryId(newCategories.length > 0 ? newCategories[0].id : null);
                        }
                    }
                    break;
                
                case 'merge_categories':
                    if (result.category_details) {
                        const { sourceName, destinationName } = result.category_details;
                        const sourceCat = newCategories.find(c => c.name.toLowerCase() === sourceName.toLowerCase());
                        const destCat = newCategories.find(c => c.name.toLowerCase() === destinationName.toLowerCase());
                        
                        if (sourceCat && destCat) {
                            const itemsToMove = sourceCat.items;
                            newCategories = newCategories
                                .map(c => {
                                    if (c.id === destCat.id) {
                                        return { ...c, items: [...c.items, ...itemsToMove] };
                                    }
                                    return c;
                                })
                                .filter(c => c.id !== sourceCat.id);
                        }
                    }
                    break;


                case 'delete':
                    if (result.filter) {
                        const targetCategory = newCategories.find((c: Category) => c.name.toLowerCase() === result.filter.categoryName.toLowerCase());
                        if (targetCategory) {
                            targetCategory.items = targetCategory.items.filter((i: Item) => i.completed !== result.filter.completed);
                        }
                    } else {
                        result.items?.forEach((itemToDelete: any) => {
                            const targetCategory = newCategories.find((c: Category) => c.name.toLowerCase() === itemToDelete.categoryName.toLowerCase());
                            if (targetCategory) {
                                targetCategory.items = targetCategory.items.filter((i: Item) => i.content.toLowerCase() !== itemToDelete.content.toLowerCase());
                            }
                        });
                    }
                    break;
            }
            setCategories(newCategories);
            
            const aiMessage: ChatMessage = { id: `msg-${Date.now() + 1}`, text: result.response, sender: 'ai' };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error processing chat command:", error);
            const errorMessage: ChatMessage = { id: `msg-${Date.now() + 1}`, text: "Désolé, une erreur est survenue.", sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoadingAI(false);
        }
    }, [isLoadingAI, categories, activeCategoryId, activeCategory?.name]);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-screen font-sans text-gray-800 dark:text-gray-200 bg-slate-50 dark:bg-slate-900 pt-4">
                <div className="flex-grow flex flex-row overflow-hidden">
                    <aside className="w-1/3 md:w-1/4 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 overflow-y-auto">
                        <CategoryPanel 
                            categories={categories}
                            activeCategoryId={activeCategoryId}
                            onSelectCategory={(id) => { setActiveCategoryId(id); setSelectedItemId(null); }}
                            onAddCategory={handleAddCategory}
                            onDeleteCategory={handleDeleteCategory}
                            onUndo={handleUndo}
                            isUndoable={undoAction !== null}
                        />
                    </aside>

                    <main className="flex-grow flex flex-col overflow-hidden">
                        <div className="flex-grow p-4 overflow-y-auto">
                            {activeCategory ? (
                                <ItemListPanel 
                                    key={activeCategory.id}
                                    category={activeCategory}
                                    selectedItemId={selectedItemId}
                                    onAddItem={(content, dueDate) => handleAddItem(activeCategory.id, content, dueDate)}
                                    onToggleItem={(itemId) => handleToggleItem(activeCategory.id, itemId)}
                                    onDeleteItem={(itemId) => handleDeleteItem(activeCategory.id, itemId)}
                                    onSelectItem={handleSelectItem}
                                    onUpdateItemNotes={(itemId, notes) => handleUpdateItemNotes(activeCategory.id, itemId, notes)}
                                />
                            ) : (
                                <div className="flex-grow flex items-center justify-center text-gray-500 h-full">
                                    <p>Sélectionnez une catégorie ou créez-en une nouvelle.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
                
                <footer className="w-full flex-shrink-0">
                    <ChatPanel
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoadingAI}
                    />
                </footer>
                
                <UndoToast undoAction={undoAction} onUndo={handleUndo} />

                {confirmAction && (
                    <ConfirmationDialog
                        message={confirmAction.message}
                        onConfirm={confirmAction.onConfirm}
                        onCancel={() => setConfirmAction(null)}
                    />
                )}

            </div>
        </DndContext>
    );
};

export default App;