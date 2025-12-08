"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { NoteEditor } from "@/components/editor/note-editor"
import { ShareDialog } from "@/components/editor/share-dialog"
import { TagInput } from "@/components/ui/tag-input"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, CheckCircle2, Cloud, Unlink } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Note } from "@/types"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { IndexeddbPersistence } from "y-indexeddb"

interface NoteDetailProps {
  noteId: string
  repositoryId?: string
  isDefaultRepository?: boolean
  onDeleteSuccess?: () => void
}

export function NoteDetail({ noteId, repositoryId, isDefaultRepository, onDeleteSuccess }: NoteDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  
  // Determine if we are in "Remove" mode (Custom Repository) or "Delete" mode (Default Repo / All Notes)
  const isRemoveMode = !!repositoryId && !isDefaultRepository
    
  // Y.js State
  const [yDoc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")

  // 自动保存防抖
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

   // 权限判断
  const role = note?.role || "VIEWER"
  const isReadOnly = role === "VIEWER"
  const canShare = ["OWNER", "ADMIN"].includes(role)
  const canDelete = role === "OWNER" || (isRemoveMode && ["OWNER", "ADMIN", "EDITOR"].includes(role)) // 移除权限稍微宽松点？或者保持一致


  // 初始化 Y.js Provider
  useEffect(() => {
    let wsProvider: HocuspocusProvider | null = null
    let indexeddbProvider: IndexeddbPersistence | null = null

    const init = async () => {
      // 1. 离线存储 (立即生效)
      try {
        indexeddbProvider = new IndexeddbPersistence(noteId + '_v2', yDoc)
        indexeddbProvider.on('synced', () => {
          console.log('Content loaded from IndexedDB')
        })
      } catch (err) {
        console.error('[IndexedDB] failed to initialize', err)
        // 尝试清理
        try {
            if (typeof indexedDB !== 'undefined') {
                indexedDB.deleteDatabase('yjs')
            }
        } catch (e) {}
        indexeddbProvider = null
      }

      // 2. 获取 Token 并连接 WebSocket
      try {
        const res = await fetch(`/api/collaboration/auth?noteId=${noteId}`)
        if (!res.ok) throw new Error('Failed to get auth token')
        const { token, role: wsRole } = await res.json()

        wsProvider = new HocuspocusProvider({
          url: `ws://localhost:1234`,
          name: noteId,
          token,
          document: yDoc,
          onStatus: (data) => {
            setStatus(data.status)
          },
        })

        setProvider(wsProvider)
      } catch (error) {
        console.error('Failed to connect to collaboration server:', error)
        setStatus('disconnected')
        toast.error("连接协作服务失败，将仅在本地保存")
      }
    }

    init()

    return () => {
      if (wsProvider) wsProvider.destroy()
      if (indexeddbProvider) indexeddbProvider.destroy()
    }
  }, [noteId, yDoc])

  // 监听 Y.js 标题变化
  useEffect(() => {
    const yTitle = yDoc.getText('title')
    
    const observer = () => {
      setTitle(yTitle.toString())
    }
    
    yTitle.observe(observer)
    
    // 初始值同步
    if (yTitle.length > 0) {
        setTitle(yTitle.toString())
    }

    return () => yTitle.unobserve(observer)
  }, [yDoc])

  // 初始化本地状态 (从 API 获取的数据)
  useEffect(() => {
    if (note) {
      // 如果 Y.js 标题为空，且 API 有标题，则初始化 Y.js
      // 这通常发生在首次加载且本地/远程没有 Y.js 数据时
      const yTitle = yDoc.getText('title')
      if (yTitle.length === 0 && note.title) {
          yDoc.transact(() => {
              yTitle.insert(0, note.title)
          })
      }
      
      setTags(note.tags?.map(t => t.name) || [])
      
      setTimeout(() => {
        isFirstLoad.current = false
      }, 100)
    }
  }, [note, yDoc])

  // 处理标题变更
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setTitle(newTitle)
      
      const yTitle = yDoc.getText('title')
      if (yTitle.toString() !== newTitle) {
          yDoc.transact(() => {
              yTitle.delete(0, yTitle.length)
              yTitle.insert(0, newTitle)
          })
      }
  }

  // 保存笔记 Mutation (仅保存标签，标题通过 Y.js -> Webhook 保存)
  const saveMutation = useMutation({
    mutationFn: async (data: { tags: string[] }) => {
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

  // 监听防抖后的值变化，触发自动保存 (仅标签)
  useEffect(() => {
    if (isFirstLoad.current) return
    if (!note) return
    if (isReadOnly) return // 只读模式下不自动保存

    saveMutation.mutate({ 
      tags: debouncedTags 
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTags])

  // 删除/移除笔记 Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isRemoveMode) {
          // Remove from repository
          const res = await fetch(`/api/repositories/${repositoryId}/notes/${noteId}`, {
            method: "DELETE",
          })
          if (!res.ok) throw new Error("Failed to remove note from repository")
      } else {
          // Delete note permanently
          const res = await fetch(`/api/notes/${noteId}`, {
            method: "DELETE",
          })
          if (!res.ok) throw new Error("Failed to delete note")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      if (isRemoveMode) {
          queryClient.invalidateQueries({ queryKey: ["repository-notes", repositoryId] })
          toast.success("笔记已从知识库移除")
      } else {
          toast.success("笔记已删除")
      }
      
      if (onDeleteSuccess) {
        onDeleteSuccess()
      } else {
        router.push(isRemoveMode ? `/repositories/${repositoryId}` : "/notes")
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
            onChange={handleTitleChange}
            readOnly={isReadOnly}
            className={cn(
                "text-lg font-bold border-none shadow-none focus-visible:ring-0 px-0",
                isReadOnly && "cursor-not-allowed opacity-80"
            )}
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

          {canShare && <ShareDialog noteId={noteId} noteTitle={title} />}

          {canDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive"
            title={isRemoveMode ? "从知识库移除" : "删除笔记"}
            onClick={() => {
                const message = isRemoveMode 
                    ? "确定要从该知识库移除这篇笔记吗？笔记本身不会被删除。" 
                    : "确定要永久删除这篇笔记吗？此操作不可恢复。"
                
                if(confirm(message)) {
                    deleteMutation.mutate()
                }
            }}
          >
            {isRemoveMode ? <Unlink className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </Button>
          )}
        </div>
      </div>

      {/* 标签栏 */}
      <div className="px-4 py-2 border-b">
        <TagInput 
            value={tags} 
            onChange={setTags} 
            placeholder={isReadOnly ? "无标签" : "添加标签..."}
            disabled={isReadOnly}
        />
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden bg-editor text-editor-foreground">
        <NoteEditor 
            key={noteId}
            note={note}
            yDoc={yDoc}
            provider={provider}
            status={status}
            readOnly={isReadOnly}
        />
      </div>
    </div>
  )
}
