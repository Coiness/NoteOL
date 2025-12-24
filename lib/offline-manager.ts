/**
 * OfflineManager: 本地存储与索引管理器
 * 
 * 核心职责:
 * 1. 管理 IndexedDB 数据库 (noteol_offline)
 * 2. 维护轻量级笔记索引 (notes_index)，用于快速列表渲染和搜索
 * 3. 提供本地全文搜索能力 (基于内存过滤)
 * 4. 从 Y.Doc 中提取元数据并更新索引
 */

import { Doc } from 'yjs'
import { NoteIndexEntry } from '@/types/offline'

// IndexedDB 数据库名称和版本
const DB_NAME = 'noteol_offline'
const DB_VERSION = 3 // Bump version for sync_queue

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
        
        // 创建新的笔记索引存储
        if (!db.objectStoreNames.contains('notes_index')) {
          const indexStore = db.createObjectStore('notes_index', { keyPath: 'id' })
          indexStore.createIndex('repositoryId', 'repositoryId', { unique: false })
          indexStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          indexStore.createIndex('title', 'title', { unique: false })
        }

        // 创建同步队列存储 (Sync Queue)
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
          queueStore.createIndex('createdAt', 'createdAt', { unique: false })
          // 我们可以为每个笔记维护一个队列，也可以用全局队列
          // 这里使用全局队列，按时间顺序处理
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

  /**
   * 生成本地笔记ID
   * 
   * 使用 crypto.randomUUID 生成标准的 UUID v4。
   * 如果环境不支持，则回退到基于 Math.random 的 polyfill。
   * 
   * @returns {string} - UUID 字符串
   */
  generateLocalNoteId(): string {
    // 使用标准 UUID 替代 local_ 前缀，以便于服务器兼容
    // 如果浏览器不支持 randomUUID，回退到基于时间的生成方式但保持 UUID 格式长度
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
  }

  /**
   * 更新笔记索引
   * 
   * 从 Y.js 文档 (Y.Doc) 中提取最新的元数据 (Title, Tags, UpdatedAt)，
   * 并解析文档内容生成预览文本 (Preview)，然后更新到 IndexedDB 的 notes_index 存储中。
   * 
   * @param {Doc} doc - Y.js 文档实例
   * @returns {Promise<void>}
   */
  async updateNoteIndex(doc: Doc): Promise<void> {
    if (!this.db) await this.initDB()

    const metadata = doc.getMap('metadata')
    const id = (metadata.get('id') as string) || doc.guid
    if (!id) return

    // 4. 从 Y.Doc 中提取元数据并更新索引
    //    (包括生成列表页所需的预览文本：取首句或前30字)
    
    // 提取文本预览 (用于列表展示，避免加载完整 Y.Doc)
    // 规则：取第一句话(以句号/换行符结尾) 或 前30个字符，取较短者
    let preview = ''
    try {
      const fragment = doc.getXmlFragment('default')
      const xmlString = fragment.toString()
      // 移除 HTML 标签
      const text = xmlString.replace(/<[^>]+>/g, ' ').trim()
      // 获取第一句话
      const firstSentence = text.split(/[.\n]/)[0]
      // 截断逻辑：如果第一句短于30字则用第一句，否则截取前30字
      preview = (firstSentence.length < 30 ? firstSentence : text.slice(0, 30))
    } catch (e) {
      // 预览生成失败不应阻塞索引更新
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