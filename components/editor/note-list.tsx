"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Loader2, Search } from "lucide-react"
import { cn, stripHtml, getTagColor } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Note } from "@/types"

import { NoteSettingsDialog } from "@/components/editor/note-settings-dialog"

interface NoteListProps {
  repositoryId?: string
}

export function NoteList({ repositoryId }: NoteListProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  
  // 使用 URL query 参数中的 noteId
  const currentNoteId = searchParams.get("noteId") 

  // 获取笔记列表
  const { data: notes, isLoading } = useQuery<Note[]>({
    queryKey: ["notes", repositoryId],  // 加入 repositoryId 作为缓存键的一部分
    queryFn: async () => {
      const url = repositoryId 
        ? `/api/notes?repositoryId=${repositoryId}`
        : "/api/notes"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch notes")
      const data = await res.json()
      return data.data.notes
    },
  })

  // 创建新笔记
  const createMutation = useMutation({
    mutationFn: async () => {
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
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      // 如果在知识库视图，使用 query 参数跳转
      router.push(`/repositories/${repositoryId}?noteId=${data.data.id}`)
    },
  })
  // 过滤笔记
  const filteredNotes = notes?.filter(note => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    
    // 标签搜索 (#tag)
    if (query.startsWith("#")) {
        const tagName = query.slice(1)
        if (!tagName) return true
        return note.tags?.some(tag => tag.name.toLowerCase().includes(tagName))
    }

    // 普通搜索 (标题或内容)
    return (
        note.title.toLowerCase().includes(query) || 
        (note.content && note.content.toLowerCase().includes(query))
    )
  })

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-2 p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">笔记列表</h2>
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
        ) : filteredNotes?.length === 0 ? (
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
            {filteredNotes?.map((note) => (
              <Link
                key={note.id}
                href={repositoryId ? `/repositories/${repositoryId}?noteId=${note.id}` : `/notes/${note.id}`}
                className={cn(
                  "group flex flex-col gap-1 p-4 border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/50",
                  currentNoteId === note.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <div className="font-medium truncate">
                  {note.title || "无标题笔记"}
                </div>
                <div className="flex gap-1 flex-wrap mb-1">
                    {note.tags?.map(tag => (
                        <Badge key={tag.id} variant={getTagColor(tag.name)} className="text-[10px] px-1 py-0 h-4">
                            #{tag.name}
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
          </div>
        )}
      </div>
    </div>
  )
}

