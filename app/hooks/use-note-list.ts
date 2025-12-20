"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { Note } from "@/types"
import { noteService } from "@/lib/services/note-service"

interface UseNoteListProps {
  repositoryId?: string
  searchQuery: string
  sortOrder: "updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "title_asc" | "title_desc"
}

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

  const notes = (data?.pages.flatMap((page: any) => page.notes) || []) as Note[]

  return {
    notes,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  }
}
