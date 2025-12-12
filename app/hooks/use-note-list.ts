"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Note } from "@/types"
import { useOffline } from "@/app/hooks/use-offline"
import { OfflineNote } from "@/types"

interface UseNoteListProps {
  repositoryId?: string
  searchQuery: string
  sortOrder: "updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "title_asc" | "title_desc"
}

export function useNoteList({ repositoryId, searchQuery, sortOrder }: UseNoteListProps) {
  // 获取在线笔记列表 (无限滚动)
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["notes", repositoryId, searchQuery, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      const [sort, order] = sortOrder.split("_")
      const sortParam = sort === "updated" ? "updatedAt" : sort === "created" ? "createdAt" : "title"

      const params = new URLSearchParams()
      if (repositoryId) params.set("repositoryId", repositoryId)
      if (searchQuery) params.set("query", searchQuery)
      params.set("sort", sortParam)
      params.set("order", order)
      params.set("page", pageParam.toString())
      params.set("limit", "20")

      const res = await fetch(`/api/notes?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch notes")
      const json = await res.json()
      return json.data
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
    initialPageParam: 1,
    staleTime: 1000 * 10, // 10秒内不重新请求
    refetchOnWindowFocus: false,
  })

  const notes = (data?.pages.flatMap((page: any) => page.notes) || []) as Note[]
  const [offlineNotes, setOfflineNotes] = useState<OfflineNote[]>([])

  // 离线功能
  const { getOfflineNotes, setGlobalRefreshCallback } = useOffline()

  // 使用 useRef 存储稳定的刷新函数，避免依赖变化导致的循环
  const refreshOfflineNotesRef = useRef<() => Promise<void>>(async () => {})

  // 刷新离线笔记的函数 - 使用 useRef 确保稳定
  refreshOfflineNotesRef.current = useCallback(async () => {
    console.log('[DEBUG] Refreshing offline notes - START')
    try {
      const notes = await getOfflineNotes()
      console.log('[DEBUG] Got offline notes:', notes.length, 'notes')
      const filteredNotes = notes.filter(note =>
        !repositoryId || note.repositoryId === repositoryId
      )
      console.log('[DEBUG] Filtered offline notes:', filteredNotes.length, 'notes')
      console.log('[DEBUG] Setting offline notes state with:', filteredNotes.map(n => ({ id: n.id, title: n.title, tags: n.tags })))
      setOfflineNotes(filteredNotes)
      console.log('[DEBUG] State updated, offlineNotes should trigger re-render')
      console.log('[DEBUG] Refreshing offline notes - END')
    } catch (error) {
      console.error("Failed to refresh offline notes:", error)
    }
  }, [repositoryId, getOfflineNotes])

  // 设置全局刷新回调 - 只在组件挂载时设置一次
  useEffect(() => {
    const stableCallback = () => {
      console.log('[DEBUG] Global refresh callback triggered')
      refreshOfflineNotesRef.current?.()
    }
    setGlobalRefreshCallback(stableCallback)

    // 组件卸载时清理
    return () => {
      setGlobalRefreshCallback(() => {})
    }
  }, []) // 空依赖数组，只在挂载时执行一次

  // 加载离线笔记
  useEffect(() => {
    refreshOfflineNotesRef.current?.()
    // 移除轮询，改为依赖事件触发刷新，避免控制台刷屏
    // const interval = setInterval(() => refreshOfflineNotesRef.current?.(), 2000)
    // return () => clearInterval(interval)
  }, []) // 移除依赖，避免循环

  // 合并在线和离线笔记，并按当前排序规则排序 - 使用 useMemo 优化
  const allNotes = useMemo(() => {
    console.log('[DEBUG] allNotes useMemo triggered, online notes:', (data?.pages.flatMap((page: any) => page.notes) || []).length, 'offline notes:', offlineNotes.length)
    const onlineNotes = (data?.pages.flatMap((page: any) => page.notes) || []) as Note[]

    const offlineNotesConverted = offlineNotes.map(note => ({
      ...note,
      role: "OWNER" as const,
      isOffline: true,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      tags: note.tags.map(tag => ({
        id: tag,
        name: tag,
        userId: "",
        createdAt: note.createdAt.toISOString()
      })) // 将 string[] 转换为 Tag[]
    } as Note & { isOffline: boolean }))

    const result = [...onlineNotes, ...offlineNotesConverted].sort((a, b) => {
      // 根据当前排序规则排序
      const [sortField, sortDirection] = sortOrder.split("_")
      const multiplier = sortDirection === "desc" ? -1 : 1

      let aValue: any, bValue: any

      switch (sortField) {
        case "updated":
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        case "created":
          aValue = new Date(a.createdAt || a.updatedAt).getTime()
          bValue = new Date(b.createdAt || b.updatedAt).getTime()
          break
        case "title":
          aValue = (a.title || "").toLowerCase()
          bValue = (b.title || "").toLowerCase()
          break
        default:
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
      }

      if (typeof aValue === "string") {
        return aValue.localeCompare(bValue) * multiplier
      }

      return (aValue - bValue) * multiplier
    })

    console.log('[DEBUG] allNotes result:', result.map(n => ({ id: n.id, title: n.title, tags: n.tags, isOffline: (n as any).isOffline })))
    return result
  }, [data, offlineNotes, sortOrder])

  return {
    allNotes,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  }
}