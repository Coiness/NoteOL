"use client"

/**
 * 负责监控网络状态和触发同步，不再插手具体的数据操作
 * 数据操作逻辑放到NoteService
 */

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// Global callback for refreshing UI
let globalRefreshCallback: (() => void) | null = null

// React Hook for offline functionality
export function useOffline() {
  const [isOnline, setIsOnline] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const queryClient = useQueryClient()

  // 客户端检查
  useEffect(() => {
    setIsClient(true)
    setIsOnline(navigator.onLine)
  }, [])

  // 监听网络状态变化
  useEffect(() => {
    if (!isClient) return

    const handleOnline = () => {
      setIsOnline(true)
      // 网络恢复时，触发队列处理
      // 注意：syncQueueManager.processQueue() 执行完后会自动调用 noteService.syncMetadataSnapshot()
      // 所以我们不需要在这里手动调用 syncMetadataSnapshot
      import('@/lib/sync-queue-manager').then(({ syncQueueManager }) => {
        syncQueueManager.processQueue().then(() => {
           // 队列处理完毕且元数据拉取完成后，刷新 React Query 缓存
           queryClient.invalidateQueries({ queryKey: ['notes'] })
        })
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 定时轮询 (Polling) 机制
    // 每 5 分钟拉取一次最新的元数据，确保列表不过时
    const pollingInterval = setInterval(() => {
      if (navigator.onLine) {
        import('@/lib/services/note-service').then(({ noteService }) => {
          noteService.syncMetadataSnapshot().catch(console.error)
        })
      }
    }, 5 * 60 * 1000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(pollingInterval)
    }
  }, [queryClient, isClient])

  // 设置全局刷新回调
  const setGlobalRefreshCallback = useCallback((callback: () => void) => {
    globalRefreshCallback = callback
  }, [])

  // 触发全局刷新
  const triggerGlobalRefresh = useCallback(() => {
    if (globalRefreshCallback) {
      globalRefreshCallback()
    }
  }, [])

  // 返回的方法
  return {
    isOnline,
    setGlobalRefreshCallback,
    triggerGlobalRefresh,
  }
}
