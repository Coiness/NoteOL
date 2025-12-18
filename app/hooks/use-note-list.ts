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
  const [cachedNotes, setCachedNotes] = useState<Note[]>([])
  const [isLoadingCached, setIsLoadingCached] = useState(true)

  // 获取离线管理器方法
  const { cacheNotesList, getCachedNotesList } = useOffline()

  // 加载缓存的笔记列表
  const loadCachedNotes = useCallback(async () => {
    try {
      setIsLoadingCached(true)
      const cached = await getCachedNotesList(repositoryId || 'all')
      if (cached) {
        setCachedNotes(cached)
      }
    } catch (error) {
      console.error('Failed to load cached notes:', error)
    } finally {
      setIsLoadingCached(false)
    }
  }, [repositoryId, getCachedNotesList])

  // 组件挂载时加载缓存数据
  useEffect(() => {
    loadCachedNotes()
  }, [loadCachedNotes])

  // 获取在线笔记列表 (无限滚动) - 现在作为后台更新
  const {
    data,
    isLoading: isLoadingOnline,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
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

      const res = await fetch(`/api/notes?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      })
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
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
    refetchOnWindowFocus: false,
    enabled: !isLoadingCached, // 只有在缓存加载完成后才获取在线数据
    // tips:这是什么意思？
    // 当缓存加载完成后，才开始获取在线数据
    // 这样可以确保列表在在线数据更新时（如创建新笔记后）能及时刷新
  })

  // 当在线数据获取成功时，更新缓存
  useEffect(() => {
    if (data?.pages) {
      const allOnlineNotes = data.pages.flatMap((page: any) => page.notes) as Note[]
      if (allOnlineNotes.length > 0) {
        cacheNotesList(repositoryId || 'all', allOnlineNotes)
          .then(() => {
            // 更新本地状态
            setCachedNotes(allOnlineNotes)
          })
          .catch(error => {
            console.error('Failed to cache notes list:', error)
          })
      }
    }
  }, [data, repositoryId, cacheNotesList])

  const [offlineNotes, setOfflineNotes] = useState<OfflineNote[]>([])

  // 离线功能
  const { getOfflineNotes, setGlobalRefreshCallback } = useOffline()

  // 使用 useRef 存储稳定的刷新函数，避免依赖变化导致的循环
  const refreshOfflineNotesRef = useRef<() => Promise<void>>(async () => {})

  // 刷新离线笔记的函数 - 使用 useRef 确保稳定
  refreshOfflineNotesRef.current = useCallback(async () => {
    try {
      const notes = await getOfflineNotes()
      const filteredNotes = notes.filter(note =>
        !repositoryId || note.repositoryId === repositoryId
      )
      setOfflineNotes(filteredNotes)
    } catch (error) {
      console.error("Failed to refresh offline notes:", error)
    }
  }, [repositoryId, getOfflineNotes])

  // 设置全局刷新回调 - 只在组件挂载时设置一次
  useEffect(() => {
    const stableCallback = () => {
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

  // 合并缓存、在线和离线笔记，并按当前排序规则排序 - 使用 useMemo 优化
  const allNotes = useMemo(() => {
    // 计算在线笔记
    const onlineNotes = (data?.pages.flatMap((page: any) => page.notes) || []) as Note[]

    // 优先使用缓存数据，如果没有缓存则使用在线数据
    const primaryNotes = cachedNotes.length > 0 ? cachedNotes : onlineNotes

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

    const result = [...primaryNotes, ...offlineNotesConverted].sort((a, b) => {
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

    // 只在数据长度变化或首条数据变化时打印
    if (result.length > 0) {
      // const firstNote = result[0];
    }

    return result
  }, [cachedNotes, data, offlineNotes, sortOrder])

  // 综合加载状态：如果有缓存数据就不是加载中，否则等待在线数据
  const isLoading = isLoadingCached && cachedNotes.length === 0 && isLoadingOnline

  return {
    allNotes,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    // 暴露缓存状态供调试
    hasCachedData: cachedNotes.length > 0
  }
}