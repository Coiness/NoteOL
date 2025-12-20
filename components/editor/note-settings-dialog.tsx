"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GeneralSettings } from "@/components/note/settings/general-settings"
import { MemberManagement } from "@/components/note/settings/member-management"
import { toast } from "sonner"
import { Note, Repository, Collaborator, NoteRepository } from "@/types"
import { Trash2, Settings } from "lucide-react"
import { noteService } from "@/lib/services/note-service"

interface NoteSettingsDialogProps {
  note: Note
  trigger?: React.ReactNode
  onDelete?: () => void
}

export function NoteSettingsDialog({ note, trigger, onDelete }: NoteSettingsDialogProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  // 获取完整笔记信息（包含所属知识库）
  const { data: noteData, isLoading: isLoadingNote } = useQuery<Note & { noteRepositories: NoteRepository[] }>({
    queryKey: ["note", note.id],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${note.id}`)
      if (!res.ok) throw new Error("Failed to fetch note")
      const data = await res.json()
      return data.data
    },
    enabled: isOpen,
  })

  // 获取用户的所有知识库（用于添加）
  const { data: repositories } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories")
      if (!res.ok) throw new Error("Failed to fetch repositories")
      const data = await res.json()
      return data.data
    },
    enabled: isOpen,
    staleTime: 1000 * 60, // 1 minute - reduce refetch frequency
  })

  // 获取协作者列表
  const { data: collaborators, isLoading: isLoadingCollaborators } = useQuery<Collaborator[]>({
    queryKey: ["collaborators", note.id],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${note.id}/collaborators`)
      if (!res.ok) throw new Error("Failed to fetch collaborators")
      const data = await res.json()
      return data.data
    },
    enabled: isOpen,
    staleTime: 1000 * 30, // 30 seconds - collaborators don't change that frequently
  })

  // 从知识库移除 Mutation
  const removeFromRepoMutation = useMutation({
    mutationFn: async (repoId: string) => {
      const res = await fetch(`/api/repositories/${repoId}/notes/${note.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
          const error = await res.json()
          throw new Error(error.message || "Failed to remove from repository")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", note.id] })
      toast.success("已从知识库移除")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // 删除笔记 Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      // 使用 NoteService 统一处理删除
      await noteService.deleteNote(note.id)
    },
    onSuccess: () => {
      // 尽量只刷新与该笔记所在知识库相关的 notes 查询
      const repoIds = noteData?.noteRepositories?.map(nr => nr.repository.id) || []
      if (repoIds.length > 0) {
        repoIds.forEach(id => queryClient.invalidateQueries({ queryKey: ["notes", id] }))
      } else {
        queryClient.invalidateQueries({ queryKey: ["notes"] })
      }
      toast.success("笔记已删除")
      setIsOpen(false)
      if (onDelete) onDelete()
    },
    onError: () => {
      toast.error("删除笔记失败")
    },
  })

  // 更新权限 Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/notes/${note.id}/collaborators`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })
      if (!res.ok) throw new Error("Failed to update role")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", note.id] })
      toast.success("权限已更新")
    },
    onError: () => {
      toast.error("更新权限失败")
    },
  })

  // 移除协作者 Mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const res = await fetch(`/api/notes/${note.id}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error("Failed to remove collaborator")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", note.id] })
      toast.success("协作者已移除")
    },
    onError: () => {
      toast.error("移除协作者失败")
    },
  })

  // 权限判断
  const currentUserRole = collaborators?.find(c => c.userId === session?.user?.id)?.role || note.role
  const isOwner = currentUserRole === "OWNER"
  const isAdmin = currentUserRole === "ADMIN"

  const canManageMembers = isOwner || isAdmin
  const canManageRepos = isOwner // 只有 Owner 可以管理知识库归属


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-500px">
        <DialogHeader>
          <DialogTitle>笔记设置</DialogTitle>
          <DialogDescription>
            查看和管理笔记属性、权限及协作者。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">常规信息</TabsTrigger>
            <TabsTrigger value="members">成员管理</TabsTrigger>
          </TabsList>

          {/* 常规信息 Tab */}
          <TabsContent value="general" className="space-y-4 py-4">
            <GeneralSettings
              note={note}
              noteData={noteData}
              isLoadingNote={isLoadingNote}
              repositories={repositories}
              onRemoveFromRepo={removeFromRepoMutation.mutate}
              canManageRepos={canManageRepos}
            />

            {isOwner && (
              <div className="pt-4 border-t mt-2">
                <h4 className="text-sm font-medium text-destructive mb-2">危险区域</h4>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                      if (confirm("确定要永久删除这篇笔记吗？此操作不可恢复。")) {
                          deleteNoteMutation.mutate()
                      }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  永久删除笔记
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  这将从所有知识库中彻底删除此笔记
                </p>
              </div>
            )}
          </TabsContent>

          {/* 成员管理 Tab */}
          <TabsContent value="members" className="py-4">
            <MemberManagement
              noteId={note.id}
              collaborators={collaborators}
              isLoadingCollaborators={isLoadingCollaborators}
              canManageMembers={canManageMembers}
              onUpdateRole={updateRoleMutation.mutate}
              onRemoveCollaborator={removeCollaboratorMutation.mutate}
              currentUserId={session?.user?.id}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
