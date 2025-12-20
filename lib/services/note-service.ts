import { Note } from "@/types/note"
import { OfflineNote, OfflineOperation } from "@/types/offline"
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

// 笔记服务接口，也就是提供的服务方法
export interface INoteService {
  getNotes(options?: GetNotesOptions): Promise<Note[]>
  getNote(id: string): Promise<Note | null>
  createNote(note: Partial<Note>): Promise<Note>
  updateNote(id: string, note: Partial<Note>): Promise<Note>
  syncPendingOperations(): Promise<void>
  syncFromApi(options?: GetNotesOptions): Promise<void>
}

// implements 是实现接口的关键字，这里是实现 INoteService 接口
// 实现，一个新的类，从父类或者接口实现所有的属性和方法，同时可以重写属性和方法，包含一些新的功能
export class NoteService implements INoteService {
  // 转换器，将“数据库存的格式”转换为“UI使用的格式”
  private convertOfflineNoteToNote(offlineNote: OfflineNote): Note {
    return {
      id: offlineNote.id,
      title: offlineNote.title,
      content: offlineNote.content,
      createdAt: offlineNote.createdAt.toISOString(),
      updatedAt: offlineNote.updatedAt.toISOString(),
      tags: offlineNote.tags?.map(t => ({ 
        id: t, 
        name: t, 
        userId: 'local', 
        createdAt: new Date().toISOString() 
      })) || [],
      noteRepositories: offlineNote.repositoryId ? [{
        repositoryId: offlineNote.repositoryId,
        noteId: offlineNote.id,
        repository: {
          id: offlineNote.repositoryId,
          name: 'Loading...', // Offline placeholder
          userId: 'local',
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }] : []
    }
  }

  // 获取笔记列表
  async getNotes(options: GetNotesOptions = {}): Promise<Note[]> {
    // 1.优先返回本地数据
    const offlineNotes = await offlineManager.getOfflineNotes()
    
    // 2. 对本地数据进行过滤和排序
    let filtered = offlineNotes

    if (options.repositoryId) {
      filtered = filtered.filter(n => n.repositoryId === options.repositoryId)
    }

    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase()
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) || 
        (n.content?.toLowerCase() || '').includes(query)
      )
    }

    // Sort
    const sortField = options.sort || 'updated'
    const sortOrder = options.order || 'desc'
    
    filtered.sort((a, b) => {
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

    // 分页（对于本地数据）
    // 注意：如果本地数据不完整，可能会导致分页结果与服务器不一致
    // 但是为了“离线优先”的原则，我们会返回本地数据
    if (options.page && options.limit) {
      const start = (options.page - 1) * options.limit
      filtered = filtered.slice(start, start + options.limit)
    }

    // 3. 如果在线，触发后台同步
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      // 但是为了“离线优先”的原则，我们会返回本地数据
      this.syncFromApi(options).catch(console.error)
    }
    
    // 返回经过转换器的 Note 格式
    return filtered.map(n => this.convertOfflineNoteToNote(n))
  }

  // 获取笔记
  async getNote(id: string): Promise<Note | null> {
    const offlineNote = await offlineManager.getOfflineNote(id)
    if (offlineNote) {
      return this.convertOfflineNoteToNote(offlineNote)
    }
    return null
  }

  // 新建笔记
  // 先在本地生成一个临时ID存起来，告诉UI “创建成功”，然后再后台慢慢同步给服务器
  // 上面的逻辑是放在了 createOfflineNote 方法中吗？
  async createNote(note: Partial<Note>): Promise<Note> {
    const offlineNote = await offlineManager.createOfflineNote({
      title: note.title || 'Untitled',
      content: note.content || '',
      tags: note.tags?.map(t => t.name),
      repositoryId: note.noteRepositories?.[0]?.repositoryId
    })
    
    return this.convertOfflineNoteToNote(offlineNote)
  }

  // 更新笔记
  async updateNote(id: string, note: Partial<Note>): Promise<Note> {
    await offlineManager.updateOfflineNote(id, {
      title: note.title,
      content: note.content || undefined, 
      tags: note.tags?.map(t => t.name)
    })
    
    const updated = await offlineManager.getOfflineNote(id)
    if (!updated) throw new Error('Note not found after update')
      
    return this.convertOfflineNoteToNote(updated)
  }

  // 同步待处理操作
  async syncPendingOperations(): Promise<void> {
    await offlineManager.syncPendingOperations()
  }

  // 从服务器同步数据，确保本地数据的一致性（只 pull 不 push）
  async syncFromApi(options: GetNotesOptions = {}): Promise<void> {
    try {
      // Construct URL with query params
      const params = new URLSearchParams()
      if (options.repositoryId) params.set("repositoryId", options.repositoryId)
      if (options.searchQuery) params.set("query", options.searchQuery)
      if (options.sort) {
        const sortParam = options.sort === "updated" ? "updatedAt" : options.sort === "created" ? "createdAt" : "title"
        params.set("sort", sortParam)
      }
      if (options.order) params.set("order", options.order)
      if (options.page) params.set("page", options.page.toString())
      if (options.limit) params.set("limit", options.limit.toString())

      const response = await fetch(`/api/notes?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const json = await response.json()
      // Adapt to API response structure (likely { data: Note[] })
      const serverNotes: Note[] = json.data || json

      for (const serverNote of serverNotes) {
        const offlineNote: OfflineNote = {
          id: serverNote.id,
          title: serverNote.title,
          content: serverNote.content || '',
          tags: serverNote.tags?.map(t => t.name) || [],
          repositoryId: serverNote.noteRepositories?.[0]?.repositoryId,
          createdAt: new Date(serverNote.createdAt!),
          updatedAt: new Date(serverNote.updatedAt),
          status: 'synced',
          serverId: serverNote.id
        }

        const local = await offlineManager.getOfflineNote(serverNote.id)
        
        if (!local) {
          await offlineManager.saveOfflineNote(offlineNote)
        } else if (local.status === 'synced') {
          // Last-Write-Wins based on updatedAt
          if (new Date(serverNote.updatedAt) > local.updatedAt) {
            await offlineManager.saveOfflineNote(offlineNote)
          }
        } else {
          // Conflict: Local is pending/dirty
          // Strategy: Keep local changes (client wins for now)
          console.log(`Skipping overwrite of dirty note ${serverNote.id}`)
        }
      }
    } catch (error) {
      console.error('Background sync failed:', error)
    }
  }
}


export const noteService = new NoteService()
