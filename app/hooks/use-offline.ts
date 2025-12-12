"use client"

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Y from 'yjs'
import { OfflineNote, OfflineOperation, SyncResult } from '@/types'
import { useDebounce } from '@/app/hooks/use-debounce'

// IndexedDB 数据库名称和版本
const DB_NAME = 'noteol_offline'
const DB_VERSION = 1

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
  }): Promise<OfflineNote> {
    const note: OfflineNote = {
      id: this.generateLocalNoteId(),
      title: data.title,
      content: data.content || '',
      tags: data.tags || [],
      repositoryId: data.repositoryId,
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

// React Hook for offline functionality
export function useOffline() {
  const [isOnline, setIsOnline] = useState(false)
  const [pendingNotesCount, setPendingNotesCount] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const queryClient = useQueryClient()

  // 客户端检查
  useEffect(() => {
    setIsClient(true)
    setIsOnline(navigator.onLine)
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

  // 定期检查待同步数量（用于实时更新UI）
  useEffect(() => {
    if (!isClient) return
    const interval = setInterval(updatePendingCount, 5000) // 每5秒更新一次
    return () => clearInterval(interval)
  }, [updatePendingCount, isClient])

  return {
    isOnline,
    pendingNotesCount,
    createOfflineNote: isClient ? offlineManager.createOfflineNote.bind(offlineManager) : async () => { throw new Error('Not available on server') },
    updateOfflineNote: isClient ? offlineManager.updateOfflineNote.bind(offlineManager) : async () => {},
    syncPendingOperations: isClient ? offlineManager.syncPendingOperations.bind(offlineManager) : async () => {},
    getOfflineNotes: isClient ? offlineManager.getOfflineNotes.bind(offlineManager) : async () => [],
    getOfflineNote: isClient ? offlineManager.getOfflineNote.bind(offlineManager) : async () => null,
    deleteOfflineNote: isClient ? offlineManager.deleteOfflineNote.bind(offlineManager) : async () => {},
  }
}

export { offlineManager }