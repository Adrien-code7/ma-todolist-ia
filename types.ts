export interface Item {
  id: string;
  content: string;
  completed: boolean;
  dueDate?: string; 
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  items: Item[];
}

export interface ChatMessage {
  id:string;
  text: string;
  sender: 'user' | 'ai';
}

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
}

export type UndoAction =
  | { type: 'ITEM_ADD'; payload: { categoryId: string; itemId: string; } }
  | { type: 'ITEM_DELETE'; payload: { categoryId: string; item: Item; index: number; } }
  | { type: 'ITEM_TOGGLE'; payload: { categoryId: string; itemId: string; } }
  | { type: 'ITEM_NOTES_UPDATE'; payload: { categoryId: string; itemId:string; prevNotes: string; } }
  | { type: 'ITEM_DRAG'; payload: { categoryId: string; oldIndex: number; newIndex: number; } }
  | { type: 'CATEGORY_ADD'; payload: { categoryId: string; } }
  | { type: 'CATEGORY_DELETE'; payload: { category: Category; index: number; } };
