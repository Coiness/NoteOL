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
      // 网络恢复时，触发一次元数据快照同步
      // (注意：现在真正的文档同步由 Y.js WebSocket Provider 自动处理)
      import('@/lib/services/note-service').then(({ noteService }) => {
        noteService.syncMetadataSnapshot().then(() => {
           queryClient.invalidateQueries({ queryKey: ['notes'] })
        })
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
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
