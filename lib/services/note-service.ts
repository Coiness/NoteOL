/**
 * NoteService: 统一数据服务层 (Local-First Architecture)
 * 
 * 核心职责:
 * 1. 作为 UI 与底层数据源 (IndexedDB / Y.js / API) 之间的中间件
 * 2. 实现了 "离线优先" 策略：所有读取/写入优先操作本地 IndexedDB
 * 3. 管理 Y.js 文档的生命周期：创建、元数据写入、持久化
 * 4. 维护本地搜索索引 (notes_index) 与 Y.js 数据的一致性
 * 5. 提供元数据快照同步 (Initial Sync) 功能，解决新设备登录无数据问题
 * 
 * 主要方法:
 * - getNotes: 从本地索引读取列表，支持极速分页/过滤/排序
 * - createNote: 初始化 Y.Doc，写入 Title/Tags 元数据，持久化到 y-indexeddb
 * - updateNote: 更新 Y.Doc 中的元数据，并同步更新本地索引
 * - syncMetadataSnapshot: 从 API 拉取元数据快照，填充本地索引
 */

import { Doc } from 'yjs'
import { Note } from "@/types/note"
import { NoteIndexEntry } from "@/types/offline"
import { offlineManager } from "@/lib/offline-manager"

// 查询数据时可以传入的参数
export interface GetNotesOptions {
  repositoryId?: string
  searchQuery?: string
  sort?: 'updated' | 'created' | 'title'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// 笔记服务接口
export interface INoteService {
  getNotes(options?: GetNotesOptions): Promise<Note[]>
  getNote(id: string): Promise<Note | null>
  createNote(note: Partial<Note>): Promise<Note>
  updateNote(id: string, note: Partial<Note>): Promise<Note>
  syncPendingOperations(): Promise<void>
  syncMetadataSnapshot(options?: GetNotesOptions): Promise<void>
}

export class NoteService implements INoteService {
  
  // 转换索引条目为 Note 格式 (用于 UI 展示)
  private convertIndexEntryToNote(entry: NoteIndexEntry): Note {
    return {
      id: entry.id,
      title: entry.title,
      content: entry.preview, // 列表页只需要预览
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      tags: entry.tags.map(t => ({ 
        id: t, 
        name: t, 
        userId: 'local', 
        createdAt: new Date().toISOString() 
      })),
      noteRepositories: entry.repositoryId ? [{
        repositoryId: entry.repositoryId,
        noteId: entry.id,
        repository: {
          id: entry.repositoryId,
          name: 'Loading...',
          userId: 'local',
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }] : []
    }
  }

  // 1. 获取笔记列表 (从本地索引 notes_index 读取)
  async getNotes(options: GetNotesOptions = {}): Promise<Note[]> {
    // 1.1 从 IDB 获取所有索引
    let entries = await offlineManager.searchNotes(options.searchQuery || '')
    
    // 1.2 过滤
    if (options.repositoryId) {
      entries = entries.filter(n => n.repositoryId === options.repositoryId)
    }

    // 1.3 排序
    const sortField = options.sort || 'updated'
    const sortOrder = options.order || 'desc'
    
    entries.sort((a, b) => {
      let valA: any = a.updatedAt
      let valB: any = b.updatedAt

      if (sortField === 'created') {
        valA = a.createdAt
        valB = b.createdAt
      } else if (sortField === 'title') {
        valA = a.title
        valB = b.title
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1
      } else {
        return valA < valB ? 1 : -1
      }
    })

    // 1.4 分页
    if (options.page && options.limit) {
      const start = (options.page - 1) * options.limit
      entries = entries.slice(start, start + options.limit)
    }

    // 1.5 如果在线，触发元数据快照同步 (Lazy Sync)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.syncMetadataSnapshot(options).catch(console.error)
    }

    return entries.map(e => this.convertIndexEntryToNote(e))
  }

  // 2. 获取单个笔记 (从本地索引读取元数据)
  async getNote(id: string): Promise<Note | null> {
    const entry = await offlineManager.getNoteIndex(id)
    if (entry) {
      return this.convertIndexEntryToNote(entry)
    }
    return null
  }

  // 3. 创建笔记 (直接操作 Y.js)
  async createNote(note: Partial<Note>): Promise<Note> {
    if (typeof window === 'undefined') throw new Error('createNote only on client')
    
    // 动态导入 y-indexeddb 避免 SSR 报错
    const { IndexeddbPersistence } = await import('y-indexeddb')
    
    const id = offlineManager.generateLocalNoteId()
    const doc = new Doc({ guid: id })
    
    // === 关键点：这里把元数据写入了 Y.js (Source of Truth) ===
    const metadata = doc.getMap('metadata')
    metadata.set('id', id)
    metadata.set('title', note.title || 'Untitled')
    metadata.set('tags', note.tags?.map(t => t.name) || [])
    metadata.set('repositoryId', note.noteRepositories?.[0]?.repositoryId || '')
    const now = new Date().toISOString()
    metadata.set('createdAt', now)
    metadata.set('updatedAt', now)
    // =======================================================
    
    // 3.2 持久化 Y.Doc 到 IndexedDB (Source of Truth)
    const persistence = new IndexeddbPersistence(id, doc)
    await persistence.whenSynced
    
    // 3.3 更新搜索索引 (Meta Cache)
    await offlineManager.updateNoteIndex(doc)
    
    // 3.4 清理
    persistence.destroy()
    doc.destroy()
    
    // 3.5 返回结果
    const entry = await offlineManager.getNoteIndex(id)
    return this.convertIndexEntryToNote(entry!)
  }

  // 4. 更新笔记 (元数据)
  async updateNote(id: string, note: Partial<Note>): Promise<Note> {
    if (typeof window === 'undefined') throw new Error('updateNote only on client')
    
    // 4.1 更新本地 Y.js 元数据 (Source of Truth)
    const { IndexeddbPersistence } = await import('y-indexeddb')
    const doc = new Doc({ guid: id })
    const persistence = new IndexeddbPersistence(id, doc)
    await persistence.whenSynced
    
    const metadata = doc.getMap('metadata')
    if (note.title !== undefined) metadata.set('title', note.title)
    if (note.tags !== undefined) metadata.set('tags', note.tags.map(t => t.name))
    metadata.set('updatedAt', new Date().toISOString())
    
    // 4.2 总是更新本地索引 (确保列表即时更新)
    await offlineManager.updateNoteIndex(doc)
    
    // 4.3 清理 Y.js 资源
    persistence.destroy()
    doc.destroy()
    
    // 4.4 如果在线，同步到服务器 (简单 API 同步，未来将被 SyncQueue 替代)
    if (navigator.onLine && !id.startsWith('local_')) {
      try {
        const requestId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}`
        await fetch(`/api/notes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
            body: JSON.stringify(note),
        })
      } catch (e) {
        console.error('Failed to sync update to server:', e)
        // TODO: Enqueue for later
      }
    }
    
    // 4.5 返回最新索引
    const entry = await offlineManager.getNoteIndex(id)
    if (!entry) throw new Error('Note not found after update')
    return this.convertIndexEntryToNote(entry)
  }

  // 7. 删除笔记
  async deleteNote(id: string): Promise<void> {
    // 7.1 删除本地索引
    await offlineManager.deleteNoteIndex(id)
    
    // 7.2 删除本地 Y.js 数据
    if (typeof window !== 'undefined') {
        // y-indexeddb creates databases named like the document guid
        const req = indexedDB.deleteDatabase(id)
        // Also need to delete the persistence metadata usually stored in 'yjs' db or similar?
        // Actually y-indexeddb uses the room name/guid as the DB name by default in our setup?
        // Let's check how we initialized it: new IndexeddbPersistence(id, doc)
        // Yes, the first arg is the name.
        req.onerror = () => console.error('Failed to delete Y.js DB for', id)
    }

    // 7.3 如果在线，删除服务器数据
    if (navigator.onLine && !id.startsWith('local_')) {
        const res = await fetch(`/api/notes/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete note on server")
    }
  }

  // 5. 同步待处理操作 (Legacy support, maybe deprecated in pure Y.js mode but kept for safety)
  async syncPendingOperations(): Promise<void> {
    // In pure Y.js mode, we rely on y-websocket provider to sync.
    // This method might be empty or just trigger provider reconnect?
    // For now, we keep it empty or log.
    console.log('Sync is handled by Y.js provider automatically')
  }

  // 6. 同步元数据快照 (Initial Sync)
  // 用于设备首次登录或列表刷新，快速拉取所有笔记的元数据
  async syncMetadataSnapshot(options: GetNotesOptions = {}): Promise<void> {
    try {
      const params = new URLSearchParams()
      if (options.repositoryId) params.set("repositoryId", options.repositoryId)
      
      // 我们调用旧的 API 获取列表，但只用它来更新本地索引
      const response = await fetch(`/api/notes?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch snapshot')
      const json = await response.json()
      const serverNotes: Note[] = json.data || json

      for (const serverNote of serverNotes) {
        // 将 API 返回的 Note 转换为本地索引格式
        const entry: NoteIndexEntry = {
          id: serverNote.id,
          title: serverNote.title,
          preview: (serverNote.content || '').slice(0, 200).replace(/<[^>]+>/g, ' '), // Strip tags roughly
          tags: serverNote.tags?.map(t => t.name) || [],
          repositoryId: serverNote.noteRepositories?.[0]?.repositoryId,
          createdAt: new Date(serverNote.createdAt!),
          updatedAt: new Date(serverNote.updatedAt),
          status: 'synced'
        }

        // 保存到索引
        // 注意：这里我们只更新索引，不更新 Y.Doc Binary。
        // Y.Doc Binary 会在用户打开笔记时通过 Provider 懒加载。
        // 或者我们可以尝试从 API 获取 Y.js binary (如果 API 支持)，但目前 API 返回的是 SQL 数据。
        await offlineManager.saveNoteIndex(entry)
      }
    } catch (error) {
      console.error('Metadata snapshot sync failed:', error)
    }
  }
  
  // 保留旧方法以兼容（如果需要），或者直接移除
  async syncFromApi(options?: GetNotesOptions): Promise<void> {
      return this.syncMetadataSnapshot(options)
  }
}

export const noteService = new NoteService()
