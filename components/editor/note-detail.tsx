"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { NoteEditor } from "@/components/editor/note-editor"
import { TagInput } from "@/components/ui/tag-input"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, CheckCircle2, Cloud } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Note } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"

interface NoteDetailProps {
  noteId: string
  onDeleteSuccess?: () => void
}

export function NoteDetail({ noteId, onDeleteSuccess }: NoteDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  
  // 自动保存防抖
  const debouncedTitle = useDebounce(title, 1000)
  const debouncedTags = useDebounce(tags, 1000)

  // 记录是否是首次加载，避免首次加载触发自动保存
  const isFirstLoad = useRef(true)

  // 获取笔记详情
  const { data: note, isLoading, isError } = useQuery<Note>({
    queryKey: ["note", noteId],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${noteId}`)
      if (!res.ok) throw new Error("Failed to fetch note")
      const data = await res.json()
      return data.data
    },
  })

  // 初始化本地状态
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setTags(note.tags?.map(t => t.name) || [])
      // 数据加载完成后，标记不再是首次加载
      setTimeout(() => {
        isFirstLoad.current = false
      }, 100)
    }
  }, [note])

  // 保存笔记 Mutation (仅保存标题和标签)
  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; tags: string[] }) => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to save note")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", noteId] })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
    onError: () => {
      toast.error("保存失败，请检查网络")
    },
  })

  // 监听防抖后的值变化，触发自动保存
  useEffect(() => {
    if (isFirstLoad.current) return
    if (!note) return

    // 只有当标题或标签改变时才保存
    saveMutation.mutate({ 
      title: debouncedTitle, 
      tags: debouncedTags 
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedTags])

  // 删除笔记 Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete note")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      toast.success("笔记已删除")
      if (onDeleteSuccess) {
        onDeleteSuccess()
      } else {
        router.push("/notes")
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !note) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        无法加载笔记
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex-1 mr-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-bold border-none shadow-none focus-visible:ring-0 px-0"
            placeholder="无标题笔记"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* 保存状态指示器 */}
          <div className="flex items-center text-sm text-muted-foreground mr-2">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                <span>保存中...</span>
              </>
            ) : saveMutation.isError ? (
              <span className="text-destructive flex items-center">
                <Cloud className="h-3 w-3 mr-1.5" />
                保存失败
              </span>
            ) : (
              <span className="flex items-center text-muted-foreground/60">
                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                已保存
              </span>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive"
            onClick={() => {
                if(confirm("确定要删除这篇笔记吗？")) {
                    deleteMutation.mutate()
                }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="px-4 py-2 border-b">
        <TagInput 
            value={tags} 
            onChange={setTags} 
            placeholder="添加标签..."
        />
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden bg-editor text-editor-foreground">
        <NoteEditor 
            key={noteId}
            note={note}
        />
      </div>
    </div>
  )
}
