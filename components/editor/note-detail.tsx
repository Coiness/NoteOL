"use client"

import { useState, useEffect, useRef } from "react"
import { NoteEditor } from "@/components/editor/note-editor"
import { ShareDialog } from "@/components/editor/share-dialog"
import { TagInput } from "@/components/ui/tag-input"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, CheckCircle2, Cloud, Unlink, Users } from "lucide-react"
import { Note } from "@/types"
import { cn } from "@/lib/utils"
import { useEditorSetup } from "@/app/hooks/use-editor-setup"
import { Badge } from "@/components/ui/badge"

interface NoteDetailProps {
  noteId: string
  repositoryId?: string
  isDefaultRepository?: boolean
  onDeleteSuccess?: () => void
}

export function NoteDetail({ noteId, repositoryId, isDefaultRepository, onDeleteSuccess }: NoteDetailProps) {
  const {
    note,
    isLoading,
    isError,
    title,
    tags,
    onlineUsers,
    yDoc,
    provider,
    status,
    role,
    isReadOnly,
    canShare,
    canDelete,
    handleTitleChange,
    setTags,
    saveMutation,
    deleteMutation,
  } = useEditorSetup({ noteId, repositoryId, isDefaultRepository, onDeleteSuccess })

  // Determine if we are in "Remove" mode (Custom Repository) or "Delete" mode (Default Repo / All Notes)
  const isRemoveMode = !!repositoryId && !isDefaultRepository

  // 检查是否是离线笔记
  const isOfflineNote = noteId?.startsWith('local_')

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Badge variant="default" className="bg-primary/80 hover:bg-primary/80">所有者</Badge>
      case "ADMIN":
        return <Badge variant="secondary">管理员</Badge>
      case "EDITOR":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">编辑者</Badge>
      case "VIEWER":
        return <Badge variant="outline" className="text-muted-foreground">访客</Badge>
      default:
        return null
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
        无法加载笔记
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
                    onChange={handleTitleChange}
                    readOnly={isReadOnly}
                    className={cn(
                        "text-3xl font-bold leading-tight border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-0 bg-transparent placeholder:text-muted-foreground/40",
                        isReadOnly && "cursor-not-allowed opacity-80"
                    )}
                    placeholder="无标题笔记"
                />
                <div className="flex items-center">
                    <TagInput 
                        value={tags} 
                        onChange={setTags} 
                        placeholder={isReadOnly ? "无标签" : "添加标签..."}
                        disabled={isReadOnly}
                        className="gap-1"
                        triggerClassName="h-6 text-xs px-2 border-none hover:bg-muted/50"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-1">
                {/* 保存状态指示器 */}
                <div className="items-center text-sm text-muted-foreground mr-2 hidden sm:flex">
                    {isOfflineNote ? (
                    <span className="flex items-center text-orange-600">
                        <Cloud className="h-3 w-3 mr-1.5" />
                        <span className="hidden lg:inline">离线保存</span>
                    </span>
                    ) : saveMutation.isPending ? (
                    <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        <span className="hidden lg:inline">保存中...</span>
                    </>
                    ) : saveMutation.isError ? (
                    <span className="text-destructive flex items-center">
                        <Cloud className="h-3 w-3 mr-1.5" />
                        <span className="hidden lg:inline">保存失败</span>
                    </span>
                    ) : (
                    <span className="flex items-center text-muted-foreground/60">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        <span className="hidden lg:inline">已保存</span>
                    </span>
                    )}
                </div>

                {/* 在线用户数 */}
                <div className="items-center text-sm text-muted-foreground mr-2 hidden sm:flex" title="在线用户">
                    <Users className="h-4 w-4 mr-1.5" />
                    <span>{onlineUsers}</span>
                </div>

                {/* 权限徽章 */}
                <div className="mr-2 hidden sm:block">
                    {getRoleBadge(role)}
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
