
/**
 * SyncQueueManager: 离线操作同步队列管理器
 * 
 * 核心职责:
 * 1. 管理 IndexedDB 中的 'sync_queue' 存储，持久化保存离线期间的用户操作
 * 2. 监听网络状态 (online)，在网络恢复时自动触发队列处理
 * 3. 保证操作的顺序执行 (FIFO)，确保 Create -> Update -> Delete 的逻辑正确性
 * 4. 执行完成后触发元数据全量拉取 (Pull)，实现数据闭环
 * 
 * 主要方法:
 * - enqueue(operation): 将操作推入队列。如果当前在线，尝试立即执行。
 * - processQueue(): 处理队列中的所有挂起操作。按 ID 顺序逐个执行。
 * - executeOperation(op): 将单个操作转化为实际的 API 请求 (fetch)。
 */

import { offlineManager } from './offline-manager'

export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE'

export interface SyncOperation {
  id?: number // IndexedDB 自增主键
  type: SyncOperationType
  noteId: string
  payload?: any // Create/Update 需要携带的数据
  createdAt: number
  status: 'pending' | 'processing' | 'failed'
  retryCount: number
}

class SyncQueueManager {
  private isProcessing = false
  private dbName = 'noteol_offline'
  private storeName = 'sync_queue'
  private dbVersion = 3 // 必须与 OfflineManager 保持一致

  constructor() {
    if (typeof window !== 'undefined') {
      // 监听网络连接恢复事件
      window.addEventListener('online', () => {
        console.log('[SyncQueue] Online detected, processing queue...')
        this.processQueue()
      })
    }
  }

  // 获取数据库实例的辅助方法
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * 将操作加入队列
   * 
   * 当用户进行操作（创建/更新/删除）时，首先调用此方法将操作持久化到 IndexedDB。
   * 注意：操作通常已经在 NoteService 中先应用到了本地 (Y.js/Index)，这里只是为了稍后同步给服务器 (Dual-Write)。
   * 
   * @param {Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'>} operation - 待同步的操作详情
   * @returns {Promise<void>}
   */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<void> {
    const db = await this.getDB()
    const op: SyncOperation = {
      ...operation,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    }

    // 将操作写入 IndexedDB，并返回 Promise 等待写入完成
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.add(op)
      
      request.onsuccess = () => {
        console.log(`[SyncQueue] Enqueued ${op.type} for ${op.noteId}`)
        resolve()
        // 如果当前网络在线，立即尝试处理队列 (实现近实时同步)
        if (navigator.onLine) {
          this.processQueue()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 处理队列中的所有操作
   * 
   * 按 FIFO (先进先出) 顺序读取待处理的操作，并逐个执行。
   * 包含防抖和并发锁机制，防止重复处理。
   * 
   * @returns {Promise<void>}
   */
  async processQueue(): Promise<void> {
    // 防止并发处理
    if (this.isProcessing) return
    // 离线时不处理
    if (!navigator.onLine) return

    this.isProcessing = true
    const db = await this.getDB()

    try {
      // 1. 获取所有待处理操作 (按 ID 自增顺序，保证 FIFO)
      const operations = await new Promise<SyncOperation[]>((resolve, reject) => {
        const tx = db.transaction([this.storeName], 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (operations.length === 0) {
        this.isProcessing = false
        return
      }

      console.log(`[SyncQueue] Processing ${operations.length} operations...`)

      // 2. 顺序执行每一个操作
      for (const op of operations) {
        try {
          // 调用 executeOperation 发送 API 请求
          await this.executeOperation(op)
          
          // 如果成功，从队列中删除该操作
          await this.removeOperation(op.id!)
        } catch (error) {
          console.error(`[SyncQueue] Failed to process operation ${op.id}:`, error)
          // 这里的重试逻辑暂时简化：
          // 如果失败，操作会留在队列中。下次 processQueue 会再次尝试。
          // 实际生产中可能需要增加 retryCount 计数，超过次数后移入死信队列 (Dead Letter Queue)
        }
      }
      
      // 3. 队列全部处理完毕后，触发元数据全量拉取 (Pull)
      // 这实现了 "Push then Pull" 策略，确保本地列表与服务器最新状态一致
      const { noteService } = await import('./services/note-service')
      await noteService.syncMetadataSnapshot()
      
    } catch (error) {
      console.error('[SyncQueue] Process error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // 从数据库中移除已完成的操作
  // tx: 事务, store: 对象仓库, request: IDB请求
  // IndexedDB 是异步 API，所以需要封装在 Promise 里
  private async removeOperation(id: number): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 执行单个操作：将其转化为具体的 API 请求
  private async executeOperation(op: SyncOperation): Promise<void> {
    const { type, noteId, payload } = op
    let response: Response

    switch (type) {
      case 'CREATE':
        // 这里的注释解释了为什么用 PUT：
        // 1. 我们在本地已经生成了一个 ID (例如 local_abc123)。
        // 2. 如果用标准的 POST /api/notes，服务器通常会生成一个新的 ID (例如 clx...)，这会导致 ID 不一致。
        // 3. 所以我们需要一种方式告诉服务器："用我给你的这个 ID 创建笔记"。
        // 4. PUT 方法通常用于 "更新或创建 (Upsert)"，且是幂等的 (Idempotent)，非常适合网络不稳定的同步场景。
        //    (就算发了两次，结果也是一样的，不会创建两个笔记)
        response = await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {})
        })
        break

      case 'UPDATE':
        response = await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        break

      case 'DELETE':
        response = await fetch(`/api/notes/${noteId}`, {
          method: 'DELETE'
        })
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }

    if (!response.ok) {
        // 特殊处理：如果删除操作返回 404，说明服务器上已经删除了，这算作成功
        if (type === 'DELETE' && response.status === 404) return
        
        throw new Error(`API error: ${response.statusText}`)
    }
  }
}

export const syncQueueManager = new SyncQueueManager()
