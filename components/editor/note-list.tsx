"use client"

import { useState, useEffect, useRef, memo } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Loader2, Search, ArrowUpDown, Calendar, Clock, Type } from "lucide-react"
import { cn, stripHtml, getTagColor } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useDebounce } from "@/app/hooks/use-debounce"
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
import { useStore } from "@/store/useStore"
import type { Note } from "@/types/note"

interface NoteListProps {
  repositoryId?: string
}

// 笔记项组件 - 使用 memo 避免不必要的重新渲染
const NoteItem = memo(({ 
  note, 
  repositoryId, 
  defaultRepositoryId,
  previewContent,
  currentNoteId, 
  onSettingsClick 
}: { 
  note: Note & { isOffline?: boolean }
  repositoryId?: string
  defaultRepositoryId: string | null
  previewContent?: string
  currentNoteId?: string | null
  onSettingsClick: (e: React.MouseEvent) => void
}) => {
  // 优先级：
  // 1. 传入的实时预览内容 (previewContent)
  // 2. 数据库里的原始内容 (note.content)
  
  const displayContent = previewContent ?? (stripHtml(note.content || "").slice(0, 30) || "无内容")

  const href = repositoryId 
    ? `/repositories/${repositoryId}?noteId=${note.id}` 
    : (defaultRepositoryId ? `/repositories/${defaultRepositoryId}?noteId=${note.id}` : `/repositories?noteId=${note.id}`)

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
        <span className="truncate max-w-150px">
          {displayContent}
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
  
  // 计算预览内容
  let previewContent: string | undefined
  if (data.activeNoteId === note.id && data.activeNoteContent !== null) {
    previewContent = data.activeNoteContent.slice(0, 30)
  } else if (data.notePreviews[note.id]) {
    previewContent = data.notePreviews[note.id].slice(0, 30)
  }

  return (
    <div style={style}>
      <NoteItem
        note={note}
        repositoryId={data.repositoryId}
        defaultRepositoryId={data.defaultRepositoryId}
        previewContent={previewContent}
        currentNoteId={data.currentNoteId}
        onSettingsClick={data.onSettingsClick}
      />
    </div>
  )
}

export function NoteList({ repositoryId }: NoteListProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const [sortOrder, setSortOrder] = useState<"updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "title_asc" | "title_desc">("updated_desc")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  // 从 Store 获取全局状态
  const defaultRepositoryId = useStore(state => state.defaultRepositoryId)
  const activeNoteId = useStore(state => state.activeNoteId)
  const activeNoteContent = useStore(state => state.activeNoteContent)
  const notePreviews = useStore(state => state.notePreviews)
  const { notes: allNotes, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNoteList({
    repositoryId,
    searchQuery: debouncedSearchQuery,
    sortOrder
  })

  const { createNote, isCreating, isOnline } = useNoteOperations({ repositoryId })

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
                        disabled={isCreating}
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                    {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => createNote()}>
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
                    onClick={() => createNote()}
                    disabled={isCreating}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                {isCreating ? (
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
                    onClick={() => createNote()}
                    className="mt-2"
                >
                    创建第一篇笔记
                </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {allNotes.map((note) => {
              // 计算预览内容
              let previewContent: string | undefined
              if (activeNoteId === note.id && activeNoteContent !== null) {
                previewContent = activeNoteContent.slice(0, 30)
              } else if (notePreviews[note.id]) {
                previewContent = notePreviews[note.id].slice(0, 30)
              }

              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  repositoryId={repositoryId}
                  defaultRepositoryId={defaultRepositoryId}
                  previewContent={previewContent}
                  currentNoteId={currentNoteId}
                  onSettingsClick={(e) => e.preventDefault()}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

