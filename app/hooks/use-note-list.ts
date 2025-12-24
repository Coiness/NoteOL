"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { Note } from "@/types"
import { noteService } from "@/lib/services/note-service"

interface UseNoteListProps {
  repositoryId?: string
  searchQuery: string
  sortOrder: "updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "title_asc" | "title_desc"
}

/**
 * useNoteList Hook
 * 
 * 用于获取和管理笔记列表，基于 React Query 实现无限滚动 (Infinite Scrolling)。
 * 
 * 核心功能:
 * 1. 分页获取笔记列表
 * 2. 支持按知识库过滤、关键词搜索
 * 3. 支持多种排序方式 (更新时间/创建时间/标题)
 * 4. 集成 noteService，优先展示本地数据，后台同步
 * 
 * @param {UseNoteListProps} props - 配置参数
 * @param {string} [props.repositoryId] - 知识库 ID 过滤
 * @param {string} props.searchQuery - 搜索关键词
 * @param {string} props.sortOrder - 排序方式 (例如: "updated_desc")
 * 
 * @returns {Object} - 包含笔记列表数据和分页控制方法的对象
 */
export function useNoteList({ repositoryId, searchQuery, sortOrder }: UseNoteListProps) {
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

      // 调用 NoteService 获取数据（优先返回本地数据，后台自动同步）
      const notes = await noteService.getNotes({
        repositoryId,
        searchQuery,
        sort: sortParam as any,
        order: order as any,
        page: pageParam,
        limit: 20
      })

      // 构造分页结构
      // 注意：NoteService 目前返回的是数组，我们需要手动包装成分页格式
      // 如果 notes 数量等于 limit，我们假设还有下一页
      return {
        notes,
        pagination: {
          page: pageParam,
          limit: 20,
          hasMore: notes.length === 20
        }
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
    initialPageParam: 1,
    // 设置较短的 staleTime 以便在数据更新时及时刷新，或者依赖 invalidateQueries
    staleTime: 1000 * 5, 
    refetchOnWindowFocus: true,
  })

  // 展平分页数据为单一数组
  const notes = (data?.pages.flatMap((page: any) => page.notes) || []) as Note[]

  return {
    notes,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  }
}
