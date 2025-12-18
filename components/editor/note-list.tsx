"use client"

import { useState, useEffect, useRef, memo } from "react"
import Link from "next/link"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Loader2, Search, ArrowUpDown, Calendar, Clock, Type } from "lucide-react"
import { cn, stripHtml, getTagColor } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useDebounce } from "@/app/hooks/use-debounce"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
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
import { useNoteList } from "@/app/hooks/use-note-list"
import { useNoteOperations } from "@/app/hooks/use-note-operations"
import type { Note } from "@/types/note"

interface NoteListProps {
  repositoryId?: string
}

// 笔记项组件 - 使用 memo 避免不必要的重新渲染
const NoteItem = memo(({ 
  note, 
  repositoryId, 
  currentNoteId, 
  onSettingsClick,
  isOnline
}: { 
  note: Note & { isOffline?: boolean }
  repositoryId?: string
  currentNoteId?: string | null
  onSettingsClick: (e: React.MouseEvent) => void
  isOnline: boolean
}) => {
  // 根据网络状态和笔记类型决定跳转目标
  const getHref = () => {
    // 如果是离线笔记，始终使用离线路由
    if (note.isOffline) {
      // 对于离线笔记，从 note 对象本身获取 repositoryId
      const noteRepoId = (note as any).repositoryId || repositoryId
      return `/repositories/${noteRepoId}/offline/${note.id}`
    }
    
    // 如果当前离线，使用离线路由
    if (!isOnline) {
      return `/repositories/${repositoryId}/offline/${note.id}`
    }
    
    // 在线状态使用查询参数路由
    return repositoryId ? `/repositories/${repositoryId}?noteId=${note.id}` : `/notes/${note.id}`
  }
  
  const href = getHref()
  
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-1 p-4 border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/50",
        currentNoteId === note.id && "bg-sidebar-accent text-sidebar-accent-foreground",
        note.isOffline && "border-l-4 border-l-orange-500"
      )}
    >
      <div className="font-medium truncate flex items-center gap-2">
        {note.title || "无标题笔记"}
        {note.isOffline && (
          <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-orange-600 border-orange-600">
            离线
          </Badge>
        )}
      </div>
      <div className="flex gap-1 flex-wrap mb-1">
        {note.tags?.map(tag => (
          <Badge 
            key={typeof tag === 'string' ? tag : tag.id} 
            variant={getTagColor(typeof tag === 'string' ? tag : tag.name)} 
            className="text-[10px] px-1 py-0 h-4"
          >
            #{typeof tag === 'string' ? tag : tag.name}
          </Badge>
        ))}
      </div>
      <div className="text-xs text-muted-foreground flex justify-between items-center">
        <span className="truncate max-w-[150px]">
          {stripHtml(note.content || "").slice(0, 30) || "无内容"}
        </span>
        <div className="flex items-center gap-2" onClick={onSettingsClick}>
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
  )
})

NoteItem.displayName = "NoteItem"

// 虚拟化列表项渲染组件
const VirtualizedNoteItem = ({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
  const note = data.notes[index]
  return (
    <div style={style}>
      <NoteItem
        note={note}
        repositoryId={data.repositoryId}
        currentNoteId={data.currentNoteId}
        onSettingsClick={data.onSettingsClick}
        isOnline={data.isOnline}
      />
    </div>
  )
}

export function NoteList({ repositoryId }: NoteListProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const [sortOrder, setSortOrder] = useState<"updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "title_asc" | "title_desc">("updated_desc")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  // 使用分离的 hooks
  const { allNotes, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNoteList({
    repositoryId,
    searchQuery: debouncedSearchQuery,
    sortOrder
  })

  const { createMutation, isOnline } = useNoteOperations({ repositoryId })

  // 监控网络状态变化
  useEffect(() => {
  }, [isOnline])

  // 获取当前排序的显示文本
  const getCurrentSortLabel = () => {
    switch (sortOrder) {
      case "updated_desc": return "更新时间 (最新)"
      case "updated_asc": return "更新时间 (最早)"
      case "created_desc": return "创建时间 (最新)"
      case "created_asc": return "创建时间 (最早)"
      case "title_asc": return "标题 (A-Z)"
      case "title_desc": return "标题 (Z-A)"
      default: return "更新时间 (最新)"
    }
  }

  const getCurrentSortIcon = () => {
    switch (sortOrder) {
      case "updated_desc":
      case "updated_asc":
        return <Clock className="h-4 w-4" />
      case "created_desc":
      case "created_asc":
        return <Calendar className="h-4 w-4" />
      case "title_asc":
      case "title_desc":
        return <Type className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }
  
  // 使用 URL query 参数中的 noteId
  const currentNoteId = searchParams.get("noteId")

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
                  <Button variant="ghost" size="sm" className="h-8 px-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    {getCurrentSortIcon()}
                    <span className="ml-2 text-xs">{getCurrentSortLabel()}</span>
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>排序方式</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setSortOrder("updated_desc")}
                    className={sortOrder === "updated_desc" ? "bg-accent" : ""}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    更新时间 (最新)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder("updated_asc")}
                    className={sortOrder === "updated_asc" ? "bg-accent" : ""}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    更新时间 (最早)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setSortOrder("created_desc")}
                    className={sortOrder === "created_desc" ? "bg-accent" : ""}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    创建时间 (最新)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder("created_asc")}
                    className={sortOrder === "created_asc" ? "bg-accent" : ""}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    创建时间 (最早)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setSortOrder("title_asc")}
                    className={sortOrder === "title_asc" ? "bg-accent" : ""}
                  >
                    <Type className="mr-2 h-4 w-4" />
                    标题 (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder("title_desc")}
                    className={sortOrder === "title_desc" ? "bg-accent" : ""}
                  >
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
                    <DropdownMenuItem onClick={async () => {

                      try {
                        // 创建笔记逻辑

                        // 检查网络是否正常
                        let actualOnline = false
                        try {
                          const testResponse = await fetch('/api/repositories', {
                            method: 'HEAD',
                            cache: 'no-cache',
                            signal: AbortSignal.timeout(3000)
                          })
                          actualOnline = testResponse.ok
                        } catch (error) {
                          actualOnline = false
                        }
                        
                        // 如果网络正常，直接创建在线笔记
                        if (actualOnline) {
                          const res = await fetch("/api/notes", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: "无标题笔记",
                              repositoryId: repositoryId
                            }),
                          })

                          if (!res.ok) throw new Error("Failed to create note")
                          const result = await res.json()

                          // 手动刷新缓存
                          // tips：刷新list缓存
                          queryClient.invalidateQueries({ queryKey: repositoryId ? ["notes", repositoryId] : ["notes"] })

                          // 跳转到新创建的笔记
                          if (repositoryId) {
                            // 注意跳转http://localhost:3000/repositories/cmiy0qclf0003d1076g17x9gf?noteId=cmjbclf4j0002vqbsz9wrwa5l
                            // 这正确吗？我们不是动态路由吗？
                            // tips：存疑
                            router.push(`/repositories/${repositoryId}?noteId=${result.data.id}`)
                          } else {
                            router.push(`/notes/${result.data.id}`)
                          }
                        } else {
                          // 若不正常，跳转离线逻辑
                          // 直接使用导出的 offlineManager 实例
                          const { offlineManager } = await import('@/app/hooks/use-offline')

                          const offlineNote = await offlineManager.createOfflineNote({
                            title: "无标题笔记",
                            repositoryId: repositoryId
                          }, session?.user?.id || '')

                          // 手动刷新缓存
                          queryClient.invalidateQueries({ queryKey: repositoryId ? ["notes", repositoryId] : ["notes"] })

                          // 跳转到离线笔记 - 统一使用离线路由格式
                          router.push(`/repositories/${offlineNote.repositoryId}/offline/${offlineNote.id}`)
                        }
                      } catch (error) {
                        console.error('创建笔记失败:', error)
                        toast.error('创建笔记失败')
                      }
                    }}>
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
                    onClick={async () => {

                      try {
                        // 直接执行创建逻辑，绕过 React Query
                        let actualOnline = false
                        try {
                          const testResponse = await fetch('/api/repositories', {
                            method: 'HEAD',
                            cache: 'no-cache',
                            signal: AbortSignal.timeout(3000)
                          })
                          actualOnline = testResponse.ok
                        } catch (error) {
                          actualOnline = false
                        }

                        if (actualOnline) {
                          const res = await fetch("/api/notes", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: "无标题笔记",
                              repositoryId: repositoryId
                            }),
                          })

                          if (!res.ok) throw new Error("Failed to create note")
                          const result = await res.json()

                          // 手动刷新缓存
                          queryClient.invalidateQueries({ queryKey: repositoryId ? ["notes", repositoryId] : ["notes"] })

                          // 跳转到新创建的笔记
                          if (repositoryId) {
                            router.push(`/repositories/${repositoryId}?noteId=${result.data.id}`)
                          } else {
                            router.push(`/notes/${result.data.id}`)
                          }
                        } else {
                          // 直接使用导出的 offlineManager 实例
                          const { offlineManager } = await import('@/app/hooks/use-offline')

                          const offlineNote = await offlineManager.createOfflineNote({
                            title: "无标题笔记",
                            repositoryId: repositoryId
                          }, session?.user?.id || '')

                          // 手动刷新缓存
                          queryClient.invalidateQueries({ queryKey: repositoryId ? ["notes", repositoryId] : ["notes"] })

                          // 跳转到离线笔记专用路由
                          router.push(`/repositories/${offlineNote.repositoryId}/offline/${offlineNote.id}`)
                        }
                      } catch (error) {
                        console.error('创建笔记失败:', error)
                        toast.error('创建笔记失败')
                      }
                    }}
                    disabled={false}
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
                    onClick={async () => {

                      try {
                        // 直接执行创建逻辑，绕过 React Query
                        let actualOnline = false
                        try {
                          const testResponse = await fetch('/api/repositories', {
                            method: 'HEAD',
                            cache: 'no-cache',
                            signal: AbortSignal.timeout(3000)
                          })
                          actualOnline = testResponse.ok
                        } catch (error) {
                          actualOnline = false
                        }

                        if (actualOnline) {
                          const res = await fetch("/api/notes", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: "无标题笔记",
                              repositoryId: repositoryId
                            }),
                          })

                          if (!res.ok) throw new Error("Failed to create note")
                          const result = await res.json()

                          // 手动刷新缓存
                          queryClient.invalidateQueries({ queryKey: repositoryId ? ["notes", repositoryId] : ["notes"] })

                          // 跳转到新创建的笔记
                          if (repositoryId) {
                            router.push(`/repositories/${repositoryId}?noteId=${result.data.id}`)
                          } else {
                            router.push(`/notes/${result.data.id}`)
                          }
                        } else {
                          // 直接使用导出的 offlineManager 实例
                          const { offlineManager } = await import('@/app/hooks/use-offline')

                          const offlineNote = await offlineManager.createOfflineNote({
                            title: "无标题笔记",
                            repositoryId: repositoryId
                          }, session?.user?.id || '')

                          // 手动刷新缓存
                          queryClient.invalidateQueries({ queryKey: repositoryId ? ["notes", repositoryId] : ["notes"] })

                          // 跳转到离线笔记 - 使用专用离线路由
                          router.push(`/repositories/${offlineNote.repositoryId}/offline/${offlineNote.id}`)
                        }
                      } catch (error) {
                        console.error('创建笔记失败:', error)
                        toast.error('创建笔记失败')
                      }
                    }}
                    className="mt-2"
                >
                    创建第一篇笔记
                </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {allNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                repositoryId={repositoryId}
                currentNoteId={currentNoteId}
                onSettingsClick={(e) => e.preventDefault()}
                isOnline={isOnline}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

