"use client"

/**
 * 负责监控网络状态和触发同步，不再插手具体的数据操作
 * 数据操作逻辑放到NoteService
 */

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { offlineManager } from '@/lib/offline-manager'

// Global callback for refreshing UI
let globalRefreshCallback: (() => void) | null = null

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
      // 获取待更改的Notes
      const pendingNotes = await offlineManager.getPendingNotes()
      setPendingNotesCount(pendingNotes.length)
    } catch (error) {
      console.error('Failed to get pending notes count:', error)
    }
  }, [isClient])

  // 监听网络状态变化
  // A: 为什么useEffect放这么后，钩子不是顶部调用吗？
  // 答：React Hook 必须在函数组件的顶层作用域调用，但位置可以在其他变量定义之后。
  // 只要不放在 if/for 循环内部，顺序并不影响其作为“顶层调用”的性质。
  // 这里放在后面是因为它依赖了上面定义的 updatePendingCount。
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
    }
  }, [])

  // 同步离线操作
  const syncPendingOperations = useCallback(async () => {
    if (!isClient) return
    return offlineManager.syncPendingOperations()
  }, [isClient])

  // 返回的方法
  return {
    isOnline,
    pendingNotesCount,
    syncPendingOperations,
    setGlobalRefreshCallback,
    triggerGlobalRefresh,
  }
}

export { offlineManager }
