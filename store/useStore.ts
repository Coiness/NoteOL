import { create } from 'zustand';

interface StoreState {
  count: number;
  increment: () => void;
  decrement: () => void;
  
  // Active Note State for Real-time UI updates
  activeNoteId: string | null;
  activeNoteContent: string | null;
  // Cache previews for all edited notes to avoid content flickering
  notePreviews: Record<string, string>; 
  setActiveNoteId: (id: string | null) => void;
  setActiveNoteContent: (content: string | null) => void;
  updateNotePreview: (id: string, content: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  activeNoteId: null,
  activeNoteContent: null,
  notePreviews: {},
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setActiveNoteContent: (content) => set({ activeNoteContent: content }),
  updateNotePreview: (id, content) => set((state) => ({
    notePreviews: { ...state.notePreviews, [id]: content }
  })),
}));
