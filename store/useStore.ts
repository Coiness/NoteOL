import { create } from 'zustand';

/**
 * 全局状态管理 (Zustand)
 * 
 * 管理应用程序的全局 UI 状态，包括：
 * 1. 当前激活的笔记 (Active Note) - 用于实时更新 UI 标题栏等
 * 2. 笔记预览缓存 (Note Previews) - 用于避免列表页内容闪烁
 * 3. 默认知识库 (Default Repository) - 用于 PWA 模式下的快速导航
 */

interface StoreState {
  count: number;
  increment: () => void;
  decrement: () => void;
  
  /** 当前选中的笔记 ID */
  activeNoteId: string | null;
  /** 当前选中笔记的纯文本内容 (用于字数统计或摘要) */
  activeNoteContent: string | null;
  
  /** 
   * 笔记预览缓存
   * Key: 笔记 ID
   * Value: 预览文本 (前30字)
   * 作用: 在编辑时实时更新列表页的预览，无需重新请求 API
   */
  notePreviews: Record<string, string>; 
  
  /** 默认知识库 ID (通常是 "我的笔记") */
  defaultRepositoryId: string | null;

  setActiveNoteId: (id: string | null) => void;
  setActiveNoteContent: (content: string | null) => void;
  
  /** 更新指定笔记的预览文本 */
  updateNotePreview: (id: string, content: string) => void;
  
  setDefaultRepositoryId: (id: string | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  activeNoteId: null,
  activeNoteContent: null,
  notePreviews: {},
  defaultRepositoryId: null,
  
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setActiveNoteContent: (content) => set({ activeNoteContent: content }),
  
  updateNotePreview: (id, content) => set((state) => ({
    notePreviews: { ...state.notePreviews, [id]: content }
  })),
  
  setDefaultRepositoryId: (id) => set({ defaultRepositoryId: id }),
}));
