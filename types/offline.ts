/**
 * 离线存储数据结构定义
 * 
 * 用于 IndexedDB 中的对象存储结构。
 */

/**
 * 笔记索引条目 (IndexedDB 'notes_index')
 * 
 * 这是一个轻量级的笔记摘要，用于：
 * 1. 快速渲染笔记列表 (无需加载完整的 Y.Doc)
 * 2. 支持本地全文搜索 (基于 title 和 preview)
 * 3. 离线状态下的列表展示
 */
export interface NoteIndexEntry {
  id: string
  title: string
  /** 笔记预览文本 (通常是前30-50个字符或第一句话) */
  preview: string
  tags: string[]
  repositoryId?: string
  createdAt: Date
  updatedAt: Date
  /** 同步状态 (预留字段，目前主要通过 SyncQueue 判断) */
  status: 'pending' | 'synced'
}

// Deprecated types (kept for reference if needed, but should be removed eventually)
// export interface OfflineNote { ... }
// export interface OfflineOperation { ... }
// export interface SyncResult { ... }