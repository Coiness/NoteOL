"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface Note {
  id: string
  title: string
  updatedAt: string
  content?: string
}

export function NoteList() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentNoteId = params?.noteId as string

  // 获取笔记列表
  const { data: notes, isLoading } = useQuery<Note[]>({
    queryKey: ["notes"],  // 查询键，用于标识和缓存该查询
    queryFn: async () => {  // 查询函数
      const res = await fetch("/api/notes")
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
        body: JSON.stringify({ title: "无标题笔记" }),
      })
      if (!res.ok) throw new Error("Failed to create note")
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      router.push(`/notes/${data.data.id}`)
    },
  })

  return (
    <div className="flex h-full flex-col border-r bg-muted/10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">所有笔记</h2>
        <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notes?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-2 opacity-20" />
            <p>暂无笔记</p>
            <Button 
                variant="link" 
                onClick={() => createMutation.mutate()}
                className="mt-2"
            >
                创建第一篇笔记
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            {notes?.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className={cn(
                  "flex flex-col gap-1 p-4 border-b hover:bg-muted/50 transition-colors",
                  currentNoteId === note.id && "bg-muted"
                )}
              >
                <div className="font-medium truncate">
                  {note.title || "无标题笔记"}
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span className="truncate max-w-[150px]">
                    {note.content?.slice(0, 30) || "无内容"}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(note.updatedAt), { 
                        addSuffix: true,
                        locale: zhCN 
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
