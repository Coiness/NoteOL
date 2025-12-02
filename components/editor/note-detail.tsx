"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { NoteEditor } from "@/components/editor/note-editor"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Note } from "@/types"

interface NoteDetailProps {
  noteId: string
  onDeleteSuccess?: () => void
}

export function NoteDetail({ noteId, onDeleteSuccess }: NoteDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  
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
      setContent(note.content || "")
    }
  }, [note])

  // 保存笔记 Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["notes"] }) // 刷新列表
      toast.success("笔记已保存")
    },
    onError: () => {
      toast.error("保存失败")
    },
  })

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
        router.push("/notes") // 返回列表页或首页
      }
    },
  })

  const handleSave = () => {
    saveMutation.mutate({ title, content })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            保存
          </Button>
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

      {/* 标签栏 (预留) */}
      {note?.tags && note.tags.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-b">
            {note.tags.map(tag => (
                <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
            ))}
        </div>
      )}

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <NoteEditor 
            key={noteId}
            value={content} 
            onChange={setContent} 
        />
      </div>
    </div>
  )
}
