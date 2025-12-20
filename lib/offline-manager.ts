/**
 * OfflineManager: 本地存储与索引管理器
 * 
 * 核心职责:
 * 1. 管理 IndexedDB 数据库 (noteol_offline)
 * 2. 维护轻量级笔记索引 (notes_index)，用于快速列表渲染和搜索
 * 3. 提供本地全文搜索能力 (基于内存过滤)
 * 4. 从 Y.Doc 中提取元数据并更新索引
 * 
 * 注意:
 * - 本类不再负责 "离线操作队列" (已废弃)，因为数据同步已移交给 Y.js
 * - 真正的 Y.js 二进制数据由 y-indexeddb 库直接管理，不经过此类
 */

import { Doc } from 'yjs'
import { NoteIndexEntry } from '@/types/offline'

// IndexedDB 数据库名称和版本
const DB_NAME = 'noteol_offline'
const DB_VERSION = 2

export class OfflineManager {
  private db: IDBDatabase | null = null
  private isOnline = false

  constructor() {
    // 只在客户端初始化
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      this.initDB()
      this.setupNetworkListeners()
    }
  }

  private async initDB() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open offline database')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 创建新的笔记索引存储 (New Architecture)
        // Q:我的笔记默认是会放入一个默认知识库的，笔记是存在一个多对多的关系，一个笔记可以有多个知识库
        if (!db.objectStoreNames.contains('notes_index')) {
          const indexStore = db.createObjectStore('notes_index', { keyPath: 'id' })
          indexStore.createIndex('repositoryId', 'repositoryId', { unique: false })
          indexStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          indexStore.createIndex('title', 'title', { unique: false })
        }
      }
    })
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this.isOnline = true
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  // 生成本地笔记ID
  generateLocalNoteId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 更新笔记索引 (New Architecture)
  async updateNoteIndex(doc: Doc): Promise<void> {
    if (!this.db) await this.initDB()

    const metadata = doc.getMap('metadata')
    const id = (metadata.get('id') as string) || doc.guid
    if (!id) return

    // 简单提取文本预览
    let preview = ''
    try {
      const fragment = doc.getXmlFragment('default')
      const xmlString = fragment.toString()
      // Strip HTML tags using regex
      preview = xmlString.replace(/<[^>]+>/g, ' ').slice(0, 200).trim()
    } catch (e) {
      // Ignore
    }

    const entry: NoteIndexEntry = {
      id,
      title: (metadata.get('title') as string) || '无标题',
      tags: (metadata.get('tags') as string[]) || [],
      repositoryId: metadata.get('repositoryId') as string,
      createdAt: new Date((metadata.get('createdAt') as string) || Date.now()),
      updatedAt: new Date((metadata.get('updatedAt') as string) || Date.now()),
      preview,
      status: 'pending'
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes_index'], 'readwrite')
      const store = transaction.objectStore('notes_index')
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 直接保存索引条目
  async saveNoteIndex(entry: NoteIndexEntry): Promise<void> {
    if (!this.db) await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes_index'], 'readwrite')
      const store = transaction.objectStore('notes_index')
      const request = store.put(entry)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取单个笔记索引
  async getNoteIndex(id: string): Promise<NoteIndexEntry | null> {
    if (!this.db) await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes_index'], 'readonly')
      const store = transaction.objectStore('notes_index')
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // 删除单个笔记索引
  async deleteNoteIndex(id: string): Promise<void> {
    if (!this.db) await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes_index'], 'readwrite')
      const store = transaction.objectStore('notes_index')
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取所有笔记索引
  async getNoteIndices(): Promise<NoteIndexEntry[]> {
    if (!this.db) await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes_index'], 'readonly')
      const store = transaction.objectStore('notes_index')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // 搜索笔记 (本地全文搜索)
  async searchNotes(query: string): Promise<NoteIndexEntry[]> {
    const all = await this.getNoteIndices()
    if (!query) return all
    
    const lowerQuery = query.toLowerCase()
    return all.filter(note => 
      note.title.toLowerCase().includes(lowerQuery) || 
      note.preview.toLowerCase().includes(lowerQuery) ||
      note.tags.some(t => t.toLowerCase().includes(lowerQuery))
    )
  }

  // 检查是否在线
  get isOnlineStatus(): boolean {
    return this.isOnline
  }
}

export const offlineManager = new OfflineManager()