"use client"

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Y from 'yjs'
import { OfflineNote, OfflineOperation, SyncResult } from '@/types'
import { useDebounce } from '@/app/hooks/use-debounce'

// IndexedDB 数据库名称和版本
const DB_NAME = 'noteol_offline'
const DB_VERSION = 3

class OfflineManager {
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

        // 创建离线笔记存储
        if (!db.objectStoreNames.contains('offline_notes')) {
          const notesStore = db.createObjectStore('offline_notes', { keyPath: 'id' })
          notesStore.createIndex('status', 'status', { unique: false })
          notesStore.createIndex('repositoryId', 'repositoryId', { unique: false })
        }

        // 创建离线操作存储
        if (!db.objectStoreNames.contains('offline_operations')) {
          const operationsStore = db.createObjectStore('offline_operations', { keyPath: 'id' })
          operationsStore.createIndex('status', 'status', { unique: false })
          operationsStore.createIndex('type', 'type', { unique: false })
        }

        // 创建离线知识库存储
        if (!db.objectStoreNames.contains('offline_repositories')) {
          const reposStore = db.createObjectStore('offline_repositories', { keyPath: 'id' })
          reposStore.createIndex('userId', 'userId', { unique: false })
        }

        // 创建离线笔记列表存储
        if (!db.objectStoreNames.contains('offline_notes_list')) {
          const notesListStore = db.createObjectStore('offline_notes_list', { keyPath: 'repositoryId' })
          notesListStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
    })
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return


    window.addEventListener('online', () => {
      this.isOnline = true
      this.syncPendingOperations()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  // 生成本地笔记ID
  generateLocalNoteId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 离线创建笔记
  async createOfflineNote(data: {
    title: string
    content?: string
    tags?: string[]
    repositoryId?: string
  }, userId: string): Promise<OfflineNote> {

    // 如果没有指定仓库，使用默认仓库
    let repositoryId = data.repositoryId
    if (!repositoryId) {
      const defaultRepo = await this.getOrCreateDefaultRepository(userId)
      repositoryId = defaultRepo.id
    }

    const note: OfflineNote = {
      id: this.generateLocalNoteId(),
      title: data.title,
      content: data.content || '',
      tags: data.tags || [],
      repositoryId: repositoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending'
    }

    await this.saveOfflineNote(note)
    return note
  }

  // 保存离线笔记到IndexedDB
  private async saveOfflineNote(note: OfflineNote): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_notes'], 'readwrite')
      const store = transaction.objectStore('offline_notes')
      const request = store.put(note)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取所有离线笔记
  async getOfflineNotes(): Promise<OfflineNote[]> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_notes'], 'readonly')
      const store = transaction.objectStore('offline_notes')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 获取待同步的笔记
  async getPendingNotes(): Promise<OfflineNote[]> {
    const allNotes = await this.getOfflineNotes()
    return allNotes.filter(note => note.status === 'pending')
  }

  // 更新笔记状态
  async updateNoteStatus(noteId: string, status: OfflineNote['status'], serverId?: string): Promise<void> {
    if (!this.db) await this.initDB()

    const note = await this.getOfflineNote(noteId)
    if (note) {
      note.status = status
      if (serverId) note.serverId = serverId
      note.updatedAt = new Date()
      await this.saveOfflineNote(note)
    }
  }

  // 获取单个离线笔记
  async getOfflineNote(noteId: string): Promise<OfflineNote | null> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_notes'], 'readonly')
      const store = transaction.objectStore('offline_notes')
      const request = store.get(noteId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // 删除离线笔记
  async deleteOfflineNote(noteId: string): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_notes'], 'readwrite')
      const store = transaction.objectStore('offline_notes')
      const request = store.delete(noteId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 更新离线笔记
  async updateOfflineNote(noteId: string, updates: Partial<OfflineNote>): Promise<void> {
    if (!this.db) await this.initDB()

    const note = await this.getOfflineNote(noteId)
    if (note) {
      const updatedNote = { ...note, ...updates, updatedAt: new Date() }
      await this.saveOfflineNote(updatedNote)
    } else {
    }
  }

  // 同步待处理的笔记到服务器
  async syncPendingNotes(): Promise<SyncResult[]> {
    if (!this.isOnline) return []

    const pendingNotes = await this.getPendingNotes()
    const results: SyncResult[] = []

    for (const note of pendingNotes) {
      try {
        await this.updateNoteStatus(note.id, 'syncing')

        // 调用服务器API创建笔记
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: note.title,
            content: note.content,
            tags: note.tags,
            repositoryId: note.repositoryId
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        const serverId = result.data.id

        // 更新状态为已同步
        await this.updateNoteStatus(note.id, 'synced', serverId)

        results.push({
          success: true,
          operationId: note.id,
          serverId
        })

      } catch (error) {
        console.error(`Failed to sync note ${note.id}:`, error)
        await this.updateNoteStatus(note.id, 'failed')

        results.push({
          success: false,
          operationId: note.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  // ============ 知识库数据管理方法 ============

  // 缓存知识库列表到 IndexedDB
  async cacheRepositories(repositories: any[]): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_repositories'], 'readwrite')
      const store = transaction.objectStore('offline_repositories')

      // 清空旧数据
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        // 添加新数据
        let completed = 0
        const total = repositories.length

        if (total === 0) {
          resolve()
          return
        }

        repositories.forEach(repo => {
          const request = store.put(repo)
          request.onsuccess = () => {
            completed++
            if (completed === total) {
              resolve()
            }
          }
          request.onerror = () => reject(request.error)
        })
      }
      clearRequest.onerror = () => reject(clearRequest.error)
    })
  }

  // 获取缓存的知识库列表
  async getCachedRepositories(): Promise<any[]> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_repositories'], 'readonly')
      const store = transaction.objectStore('offline_repositories')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // 缓存单个知识库
  async cacheRepository(repository: any): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_repositories'], 'readwrite')
      const store = transaction.objectStore('offline_repositories')
      const request = store.put(repository)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取缓存的单个知识库
  async getCachedRepository(repoId: string): Promise<any | null> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_repositories'], 'readonly')
      const store = transaction.objectStore('offline_repositories')
      const request = store.get(repoId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // 获取或创建默认仓库
  async getOrCreateDefaultRepository(userId: string): Promise<any> {
    if (!this.db) await this.initDB()

    // 1. 尝试从缓存获取默认仓库
    const cachedRepos = await this.getCachedRepositories()
    const defaultRepo = cachedRepos.find((repo: any) => repo.isDefault && repo.userId === userId)

    if (defaultRepo) {
      return defaultRepo
    }

    // 2. 如果缓存中没有，创建本地默认仓库
    const localDefaultRepo = {
      id: `default_${userId}`,
      name: "默认知识库",
      description: "离线创建的笔记默认存放位置",
      isDefault: true,
      userId: userId,
      color: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.cacheRepository(localDefaultRepo)
    return localDefaultRepo
  }

  // 缓存笔记列表
  async cacheNotesList(repositoryId: string, notes: any[]): Promise<void> {
    console.log('[IndexedDB] 缓存笔记列表，repositoryId:', repositoryId, 'notes:', notes?.length || 0, '条')
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_notes_list'], 'readwrite')
      const store = transaction.objectStore('offline_notes_list')

      const notesListData = {
        repositoryId,
        notes,
        updatedAt: new Date()
      }

      console.log('[IndexedDB] 存储笔记列表数据到数据库')
      const request = store.put(notesListData)
      request.onsuccess = () => {
        console.log('[IndexedDB] 笔记列表缓存成功')
        resolve()
      }
      request.onerror = () => {
        console.error('[IndexedDB] 笔记列表缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 获取缓存的笔记列表
  async getCachedNotesList(repositoryId: string): Promise<any[] | null> {
    console.log('[IndexedDB] 获取缓存笔记列表，repositoryId:', repositoryId)
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_notes_list'], 'readonly')
      const store = transaction.objectStore('offline_notes_list')
      const request = store.get(repositoryId)

      request.onsuccess = () => {
        const result = request.result
        console.log('[IndexedDB] 获取缓存结果:', result ? result.notes?.length || 0 : 0, '条笔记')
        resolve(result ? result.notes : null)
      }
      request.onerror = () => {
        console.error('[IndexedDB] 获取缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 同步所有待处理的离线操作
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline) return

    try {
      const results = await this.syncPendingNotes()

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        toast.success(`已同步 ${successCount} 篇离线创建的笔记`)
      }

      if (failCount > 0) {
        toast.error(`${failCount} 篇笔记同步失败，请稍后重试`)
      }

    } catch (error) {
      console.error('Failed to sync offline operations:', error)
      toast.error('离线同步失败')
    }
  }

  // 检查是否在线
  get isOnlineStatus(): boolean {
    return this.isOnline
  }
}

// 创建单例实例
const offlineManager = new OfflineManager()

// 全局刷新回调
let globalRefreshCallback: (() => void) | null = null

// React Hook for offline functionality
export function useOffline() {
  const [isOnline, setIsOnline] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [pendingNotesCount, setPendingNotesCount] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const queryClient = useQueryClient()

  // 客户端检查
  useEffect(() => {
    setIsClient(true)
    setIsOnline(navigator.onLine)
    setIsReady(true) // 网络状态已初始化
  }, [])

  // 更新待同步笔记数量
  const updatePendingCount = useCallback(async () => {
    if (!isClient) return
    try {
      const pendingNotes = await offlineManager.getPendingNotes()
      setPendingNotesCount(pendingNotes.length)
    } catch (error) {
      console.error('Failed to get pending notes count:', error)
    }
  }, [isClient])

  // 监听网络状态变化
  useEffect(() => {
    if (!isClient) return

    const handleOnline = () => {
      setIsOnline(true)
      // 网络恢复时自动同步
      offlineManager.syncPendingOperations().then(() => {
        updatePendingCount()
        // 刷新笔记列表
        queryClient.invalidateQueries({ queryKey: ['notes'] })
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 初始化时更新计数
    updatePendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updatePendingCount, queryClient, isClient])

  // 设置全局刷新回调
  const setGlobalRefreshCallback = useCallback((callback: () => void) => {
    globalRefreshCallback = callback
  }, [])

  // 触发全局刷新
  const triggerGlobalRefresh = useCallback(() => {
    if (globalRefreshCallback) {
      globalRefreshCallback()
    } else {
    }
  }, [])

  // 使用 useCallback 包装方法以保持引用稳定
  const createOfflineNote = useCallback(async (data: {
    title: string
    content?: string
    tags?: string[]
    repositoryId?: string
  }, userId: string) => {
    if (!isClient) throw new Error('Not available on server')
    return offlineManager.createOfflineNote(data, userId)
  }, [isClient])

  const updateOfflineNote = useCallback(async (noteId: string, updates: Partial<OfflineNote>) => {
    if (!isClient) return
    return offlineManager.updateOfflineNote(noteId, updates)
  }, [isClient])

  const syncPendingOperations = useCallback(async () => {
    if (!isClient) return
    return offlineManager.syncPendingOperations()
  }, [isClient])

  const getOfflineNotes = useCallback(async () => {
    if (!isClient) return []
    return offlineManager.getOfflineNotes()
  }, [isClient])

  const getOfflineNote = useCallback(async (noteId: string) => {
    if (!isClient) return null
    return offlineManager.getOfflineNote(noteId)
  }, [isClient])

  const deleteOfflineNote = useCallback(async (noteId: string) => {
    if (!isClient) return
    return offlineManager.deleteOfflineNote(noteId)
  }, [isClient])

  const cacheRepositories = useCallback(async (repositories: any[]) => {
    if (!isClient) return
    return offlineManager.cacheRepositories(repositories)
  }, [isClient])

  const getCachedRepositories = useCallback(async () => {
    if (!isClient) return []
    return offlineManager.getCachedRepositories()
  }, [isClient])

  const cacheRepository = useCallback(async (repository: any) => {
    if (!isClient) return
    return offlineManager.cacheRepository(repository)
  }, [isClient])

  const getCachedRepository = useCallback(async (repoId: string) => {
    if (!isClient) return null
    return offlineManager.getCachedRepository(repoId)
  }, [isClient])

  const cacheNotesList = useCallback(async (repositoryId: string, notes: any[]) => {
    if (!isClient) return
    return offlineManager.cacheNotesList(repositoryId, notes)
  }, [isClient])

  const getCachedNotesList = useCallback(async (repositoryId: string) => {
    if (!isClient) return null
    return offlineManager.getCachedNotesList(repositoryId)
  }, [isClient])

  return {
    isOnline,
    isReady,
    pendingNotesCount,
    createOfflineNote,
    updateOfflineNote,
    syncPendingOperations,
    getOfflineNotes,
    getOfflineNote,
    deleteOfflineNote,
    setGlobalRefreshCallback,
    triggerGlobalRefresh,
    // 新增的知识库缓存方法
    cacheRepositories,
    getCachedRepositories,
    cacheRepository,
    getCachedRepository,
    // 新增的笔记列表缓存方法
    cacheNotesList,
    getCachedNotesList,
  }
}

export { offlineManager }