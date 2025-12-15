"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Note, Repository, NoteRepository } from "@/types"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GeneralSettingsProps {
  note: Note
  noteData?: Note & { noteRepositories: NoteRepository[] }
  isLoadingNote: boolean
  repositories?: Repository[]
  onRemoveFromRepo: (repoId: string) => void
  canManageRepos: boolean
}

export function GeneralSettings({
  note,
  noteData,
  isLoadingNote,
  repositories,
  onRemoveFromRepo,
  canManageRepos
}: GeneralSettingsProps) {
  const queryClient = useQueryClient()
  const [selectedRepoId, setSelectedRepoId] = useState<string>("")

  // 过滤出尚未添加该笔记的知识库
  const availableRepos = repositories?.filter(repo =>
    !noteData?.noteRepositories?.some(nr => nr.repository.id === repo.id)
  ) || []

  // 添加到知识库 Mutation
  const addToRepoMutation = useMutation({
    mutationFn: async (repoId: string) => {
      const res = await fetch(`/api/repositories/${repoId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id }),
      })
      if (!res.ok) throw new Error("Failed to add to repository")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", note.id] })
      toast.success("已添加到知识库")
      setSelectedRepoId("")
    },
    onError: (error) => {
        toast.error("添加失败")
    }
  })

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>标题</Label>
        <div className="text-sm text-muted-foreground wrap-break-words">
          {note.title || "无标题"}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>创建时间</Label>
        <div className="text-sm text-muted-foreground">
          {note.createdAt ? format(new Date(note.createdAt), "yyyy年MM月dd日 HH:mm", { locale: zhCN }) : "未知"}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>最后修改</Label>
        <div className="text-sm text-muted-foreground">
          {format(new Date(note.updatedAt), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>所属知识库</Label>
        {isLoadingNote ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {noteData?.noteRepositories?.map((nr) => (
              <Badge key={nr.repository.id} variant="secondary" className="text-xs">
                {nr.repository.name}
                {canManageRepos && (
                  <button
                    onClick={() => onRemoveFromRepo(nr.repository.id)}
                    className="ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {(!noteData?.noteRepositories || noteData.noteRepositories.length === 0) && (
              <span className="text-sm text-muted-foreground">未添加到任何知识库</span>
            )}
          </div>
        )}

        {canManageRepos && (
          <div className="flex gap-2 mt-2">
            <Select
              value={selectedRepoId}
              onValueChange={setSelectedRepoId}
            >
              <SelectTrigger className="h-8 text-xs w-[200px]">
                <SelectValue placeholder="添加到知识库..." />
              </SelectTrigger>
              <SelectContent>
                {availableRepos.map(repo => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.name}
                  </SelectItem>
                ))}
                {availableRepos.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    没有更多可选知识库
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!selectedRepoId || addToRepoMutation.isPending}
              onClick={() => {
                addToRepoMutation.mutate(selectedRepoId)
              }}
            >
              {addToRepoMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              添加
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
