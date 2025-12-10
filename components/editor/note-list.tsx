"use client"

import { useState, useEffect, useRef } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Loader2, Search, ArrowUpDown, Calendar, Clock, Type } from "lucide-react"
import { cn, stripHtml, getTagColor } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { toast } from "sonner"
import { Note } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { NoteSettingsDialog } from "@/components/editor/note-settings-dialog"
import { ImportNoteDialog } from "@/components/editor/import-note-dialog"
import { useOffline } from "@/hooks/use-offline"
import { OfflineNote } from "@/types"

interface NoteListProps {
  repositoryId?: string
}

export function NoteList({ repositoryId }: NoteListProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const [sortOrder, setSortOrder] = useState<"updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "title_asc" | "title_desc">("updated_desc")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  
  // 使用 URL query 参数中的 noteId
  const currentNoteId = searchParams.get("noteId") 

  // 离线功能
  const { isOnline, pendingNotesCount, createOfflineNote, getOfflineNotes } = useOffline() 

  // 获取笔记列表 (无限滚动)
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ["notes", repositoryId, debouncedSearchQuery, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      const [sort, order] = sortOrder.split("_")
      const sortParam = sort === "updated" ? "updatedAt" : sort === "created" ? "createdAt" : "title"
      
      const params = new URLSearchParams()
      if (repositoryId) params.set("repositoryId", repositoryId)
      if (debouncedSearchQuery) params.set("query", debouncedSearchQuery)
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

  // 加载离线笔记
  useEffect(() => {
    const loadOfflineNotes = async () => {
      try {
        const notes = await getOfflineNotes()
        setOfflineNotes(notes.filter(note => 
          !repositoryId || note.repositoryId === repositoryId
        ))
      } catch (error) {
        console.error("Failed to load offline notes:", error)
      }
    }
    loadOfflineNotes()

    // 监听离线笔记变化
    const interval = setInterval(loadOfflineNotes, 2000)
    return () => clearInterval(interval)
  }, [repositoryId, getOfflineNotes])

  // 合并在线和离线笔记
  const allNotes = [...notes, ...offlineNotes.map(note => ({
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
  } as Note))].sort((a, b) => {
    // 按更新时间倒序排序
    const aTime = new Date(a.updatedAt).getTime()
    const bTime = new Date(b.updatedAt).getTime()
    return bTime - aTime
  })
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentTarget = observerTarget.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasNextPage, fetchNextPage])

  // 创建新笔记 (支持离线)
  const createMutation = useMutation({
    mutationFn: async () => {
      // 如果在线，尝试直接创建
      if (isOnline) {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            title: "无标题笔记",
            repositoryId: repositoryId // 传入当前知识库ID
          }),
        })
        if (!res.ok) throw new Error("Failed to create note")
        return res.json()
      } else {
        // 如果离线，创建本地笔记
        const offlineNote = await createOfflineNote({
          title: "无标题笔记",
          repositoryId: repositoryId
        })
        return { data: offlineNote, isOffline: true }
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      
      if (data.isOffline) {
        // 离线创建的笔记，使用本地ID
        toast.success("笔记已创建 (离线模式)")
        router.push(`/repositories/${repositoryId}?noteId=${data.data.id}`)
      } else {
        // 在线创建的笔记，使用服务器ID
        router.push(`/repositories/${repositoryId}?noteId=${data.data.id}`)
      }
    },
    onError: (error) => {
      console.error("Failed to create note:", error)
      toast.error(isOnline ? "创建笔记失败" : "离线模式下无法创建笔记")
    },
  })
  const sortedNotes = notes || []

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {repositoryId && (
        <ImportNoteDialog 
          open={isImportDialogOpen} 
          onOpenChange={setIsImportDialogOpen} 
          repositoryId={repositoryId}
        />
      )}
      <div className="flex flex-col gap-2 p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">笔记列表</h2>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>排序方式</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortOrder("updated_desc")}>
                    <Clock className="mr-2 h-4 w-4" />
                    更新时间 (最新)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("updated_asc")}>
                    <Clock className="mr-2 h-4 w-4" />
                    更新时间 (最早)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortOrder("created_desc")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    创建时间 (最新)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("created_asc")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    创建时间 (最早)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortOrder("title_asc")}>
                    <Type className="mr-2 h-4 w-4" />
                    标题 (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("title_desc")}>
                    <Type className="mr-2 h-4 w-4" />
                    标题 (Z-A)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {repositoryId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        disabled={createMutation.isPending}
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                    {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => createMutation.mutate()}>
                      <Plus className="mr-2 h-4 w-4" />
                      新建笔记
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                      <FileText className="mr-2 h-4 w-4" />
                      导入现有笔记
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Plus className="h-4 w-4" />
                )}
                </Button>
              )}
            </div>
        </div>
        <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="搜索笔记 (#标签 或 关键词)" 
                className="pl-8 h-9 bg-background/50 border-sidebar-border focus-visible:ring-sidebar-ring"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allNotes?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-2 opacity-20" />
            <p>{searchQuery ? "未找到匹配笔记" : "暂无笔记"}</p>
            {!searchQuery && (
                <Button 
                    variant="link" 
                    onClick={() => createMutation.mutate()}
                    className="mt-2"
                >
                    创建第一篇笔记
                </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {allNotes?.map((note) => (
              <Link
                key={note.id}
                href={repositoryId ? `/repositories/${repositoryId}?noteId=${note.id}` : `/notes/${note.id}`}
                className={cn(
                  "group flex flex-col gap-1 p-4 border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/50",
                  currentNoteId === note.id && "bg-sidebar-accent text-sidebar-accent-foreground",
                  (note as any).isOffline && "border-l-4 border-l-orange-500"
                )}
              >
                <div className="font-medium truncate flex items-center gap-2">
                  {note.title || "无标题笔记"}
                  {(note as any).isOffline && (
                    <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-orange-600 border-orange-600">
                      离线
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap mb-1">
                    {note.tags?.map(tag => (
                        <Badge key={typeof tag === 'string' ? tag : tag.id} variant={getTagColor(typeof tag === 'string' ? tag : tag.name)} className="text-[10px] px-1 py-0 h-4">
                            #{typeof tag === 'string' ? tag : tag.name}
                        </Badge>
                    ))}
                </div>
                <div className="text-xs text-muted-foreground flex justify-between items-center">
                  <span className="truncate max-w-[150px]">
                    {stripHtml(note.content || "").slice(0, 30) || "无内容"}
                  </span>
                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    <span className="text-[10px]">
                        {formatDistanceToNow(new Date(note.updatedAt), { 
                            addSuffix: true,
                            locale: zhCN 
                        })}
                    </span>
                    <NoteSettingsDialog note={note} />
                  </div>
                </div>
              </Link>
            ))}
            
            {/* 加载更多指示器 */}
            <div ref={observerTarget} className="h-8 w-full flex justify-center items-center p-2">
              {isFetchingNextPage && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

