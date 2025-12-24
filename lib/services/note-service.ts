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
import { syncQueueManager } from "@/lib/sync-queue-manager"

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
    
    // 3.5 同步创建请求到服务器 (SyncQueue)
    // 即使是在线状态，也建议走队列或立即发送，以确保服务器有这条记录
    const createPayload = {
        title: note.title || 'Untitled',
        tags: note.tags?.map(t => t.name) || [],
        repositoryId: note.noteRepositories?.[0]?.repositoryId
    }

    if (navigator.onLine) {
        try {
            // 使用 PUT 方法创建 (Upsert)，指定 ID
            await fetch(`/api/notes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createPayload),
            })
        } catch (e) {
            console.error('Failed to sync create to server, enqueueing:', e)
            await syncQueueManager.enqueue({
                type: 'CREATE',
                noteId: id,
                payload: createPayload
            })
        }
    } else {
        await syncQueueManager.enqueue({
            type: 'CREATE',
            noteId: id,
            payload: createPayload
        })
    }
    
    // 3.6 返回结果
    const entry = await offlineManager.getNoteIndex(id)
    return this.convertIndexEntryToNote(entry!)
  }

  /**
   * 4. 更新笔记 (元数据)
   * 
   * 更新流程:
   * 1. 转换标签格式 (string[] -> Tag[])
   * 2. 乐观更新本地索引 (notes_index) 以实现即时反馈
   * 3. 发送 API 请求到服务器 (Dual-Write)
   *    - 在线: 直接 PATCH 请求，失败则入队
   *    - 离线: 直接入队 (SyncQueue)
   * 
   * @param {string} id - 笔记 ID
   * @param {Partial<Note>} note - 待更新的字段
   * @returns {Promise<Note>} - 更新后的笔记对象
   */
  async updateNote(id: string, note: Partial<Note>): Promise<Note> {
    if (typeof window === 'undefined') throw new Error('updateNote only on client')
    
    // 4.1 更新本地 Y.js 元数据 (Source of Truth)
    // ... (代码省略: Y.js 更新逻辑在组件层或通过 hook 处理，这里主要处理 API 同步)
    // 注意：实际的 Y.js 更新通常由 Editor 组件直接操作 Y.Doc 完成
    // 这里的方法主要用于 "非编辑器环境" (如列表页重命名) 或 "触发 API 同步"

    // 4.2 构造 API 请求载荷
    // 关键修复：API Zod Schema 期望 tags 为 string[]，而前端 Note 类型中 tags 为 Tag[]
    // 因此必须在此处进行转换，否则会导致 422 Unprocessable Entity 错误
    const apiPayload: any = { ...note }
    if (note.tags) {
        apiPayload.tags = note.tags.map(t => t.name)
    }

    // 4.3 乐观更新本地索引 (为了列表页即时响应)
    const currentEntry = await offlineManager.getNoteIndex(id)
    if (currentEntry) {
        await offlineManager.saveNoteIndex({
            ...currentEntry,
            ...note as any, // 简单合并
            tags: note.tags ? note.tags.map(t => t.name) : currentEntry.tags,
            updatedAt: new Date()
        })
    }

    // 4.4 发送请求到服务器 (Dual-Write)
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload) // 使用转换后的 payload
        })
        if (!res.ok) throw new Error('Update failed')
        const data = await res.json()
        return data.data
      } catch (e) {
        // 失败回退到队列
        await syncQueueManager.enqueue({
            type: 'UPDATE',
            noteId: id,
            payload: apiPayload
        })
      }
    } else {
        await syncQueueManager.enqueue({
            type: 'UPDATE',
            noteId: id,
            payload: apiPayload
        })
    }

    // 返回本地更新后的结果
    return this.getNote(id) as Promise<Note>
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

    // 7.3 如果在线，删除服务器数据 (SyncQueue)
    if (navigator.onLine && !id.startsWith('local_')) {
        try {
            const res = await fetch(`/api/notes/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete note on server")
        } catch (e) {
            console.error('Failed to sync delete to server, enqueueing:', e)
            await syncQueueManager.enqueue({ type: 'DELETE', noteId: id })
        }
    } else {
        // 离线状态：直接入队
        await syncQueueManager.enqueue({ type: 'DELETE', noteId: id })
    }
  }

  /**
   * 5. 同步待处理操作
   * 
   * @deprecated 在纯 Y.js 模式下，同步由 Provider 自动处理。保留此方法仅为了接口兼容性。
   */
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
      // Fix: Handle API response structure correctly
      // API returns { notes: [...], pagination: {...} } or sometimes wrapped in { data: ... }
      let serverNotes: Note[] = []
      
      if (Array.isArray(json)) {
          serverNotes = json
      } else if (Array.isArray(json.data)) {
          serverNotes = json.data
      } else if (Array.isArray(json.notes)) {
          serverNotes = json.notes
      } else if (json.data && Array.isArray(json.data.notes)) {
          // Handle nested structure from apiSuccess wrapper
          serverNotes = json.data.notes
      }
      
      if (!Array.isArray(serverNotes)) {
        console.warn('syncMetadataSnapshot received unexpected data structure:', json)
        return
      }

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
