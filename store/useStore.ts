import { create } from 'zustand';

interface StoreState {
  count: number;
  increment: () => void;
  decrement: () => void;
  
  // 活跃的笔记，用于更新NoteItem内容
  activeNoteId: string | null;
  activeNoteContent: string | null; // Plain text for preview
  activeNoteTitle: string | null;
  setActiveNote: (id: string | null, content: string | null, title: string | null) => void;
  updateActiveNoteContent: (content: string) => void;
  updateActiveNoteTitle: (title: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  activeNoteId: null,
  activeNoteContent: null,
  activeNoteTitle: null,
  setActiveNote: (id, content, title) => set({ activeNoteId: id, activeNoteContent: content, activeNoteTitle: title }),
  updateActiveNoteContent: (content) => set({ activeNoteContent: content }),
  updateActiveNoteTitle: (title) => set({ activeNoteTitle: title }),
}));
