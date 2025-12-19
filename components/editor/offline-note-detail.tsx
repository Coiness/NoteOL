"use client"

import { useState, useEffect, useRef } from "react"
import { NoteEditor } from "@/components/editor/note-editor"
import { TagInput } from "@/components/ui/tag-input"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Cloud, Unlink } from "lucide-react"
import { Note } from "@/types"
import { OfflineNote } from "@/types/offline"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface OfflineNoteDetailProps {
  noteId: string
}

export function OfflineNoteDetail({ noteId }: OfflineNoteDetailProps) {
  const [note, setNote] = useState<OfflineNote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [content, setContent] = useState("")

  // 从IndexedDB加载离线笔记
  useEffect(() => {
    const loadOfflineNote = async () => {
      try {
        console.log('[OfflineNoteDetail] 加载离线笔记:', noteId)
        const { offlineManager } = await import('@/app/hooks/use-offline')
        const offlineNote = await offlineManager.getOfflineNote(noteId)

        if (offlineNote) {
          console.log('[OfflineNoteDetail] 离线笔记加载成功:', offlineNote)
          setNote(offlineNote)
          setTitle(offlineNote.title || "")
          setTags(offlineNote.tags || [])
          setContent(offlineNote.content || "")
        } else {
          console.log('[OfflineNoteDetail] 未找到离线笔记:', noteId)
          setIsError(true)
        }
      } catch (error) {
        console.error('[OfflineNoteDetail] 加载离线笔记失败:', error)
        setIsError(true)
        toast.error('加载离线笔记失败')
      } finally {
        setIsLoading(false)
      }
    }

    if (noteId) {
      loadOfflineNote()
    }
  }, [noteId])

  // 保存离线笔记
  const saveOfflineNote = async () => {
    if (!note) return

    try {
      console.log('[OfflineNoteDetail] 保存离线笔记:', noteId)
      const { offlineManager } = await import('@/app/hooks/use-offline')

      const updatedNote = {
        ...note,
        title,
        tags,
        content,
        updatedAt: new Date()
      }

      await offlineManager.updateOfflineNote(noteId, updatedNote)
      setNote(updatedNote)
      toast.success('离线笔记已保存')
    } catch (error) {
      console.error('[OfflineNoteDetail] 保存离线笔记失败:', error)
      toast.error('保存失败')
    }
  }

  // 删除离线笔记
  const deleteOfflineNote = async () => {
    try {
      console.log('[OfflineNoteDetail] 删除离线笔记:', noteId)
      const { offlineManager } = await import('@/app/hooks/use-offline')
      await offlineManager.deleteOfflineNote(noteId)
      toast.success('离线笔记已删除')
      // 可以添加跳转逻辑
    } catch (error) {
      console.error('[OfflineNoteDetail] 删除离线笔记失败:', error)
      toast.error('删除失败')
    }
  }

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
        无法加载离线笔记
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶部区域：标题 + 标签 + 工具栏 */}
      <div className="border-b p-2 pl-4 transition-all">
        <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={cn(
                        "text-3xl font-bold leading-tight border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-0 bg-transparent placeholder:text-muted-foreground/40"
                    )}
                    placeholder="无标题笔记"
                />
                <div className="flex items-center">
                    <TagInput
                        value={tags}
                        onChange={setTags}
                        placeholder="添加标签..."
                        className="flex-1"
                    />
                    <Badge variant="outline" className="ml-2 text-xs px-1 py-0 h-4 text-orange-600 border-orange-600">
                      离线
                    </Badge>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={saveOfflineNote}
                    className="h-8"
                >
                    <Cloud className="h-4 w-4 mr-1" />
                    保存
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteOfflineNote}
                    className="h-8 text-destructive hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                </Button>
            </div>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="开始编写你的笔记..."
            className="w-full h-full resize-none border-none outline-none bg-transparent text-base leading-relaxed placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
    </div>
  )
}