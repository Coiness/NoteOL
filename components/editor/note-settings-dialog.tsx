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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  MoreVertical, 
  Trash2, 
  UserX, 
  Shield, 
  Loader2, 
  Users, 
  FileText,
  Unlink
} from "lucide-react"
import { toast } from "sonner"
import { Note } from "@/types"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

interface NoteSettingsDialogProps {
  note: Note
  trigger?: React.ReactNode
  onDelete?: () => void
}

interface Collaborator {
  id: string
  userId: string
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  createdAt: string
}

export function NoteSettingsDialog({ note, trigger, onDelete }: NoteSettingsDialogProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [isEditingTitle, setIsEditingTitle] = useState(false)

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
  })

  // 更新标题 Mutation
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!res.ok) throw new Error("Failed to update title")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["note", note.id] })
      toast.success("标题已更新")
      setIsEditingTitle(false)
    },
    onError: () => {
      toast.error("更新标题失败")
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

  // 删除笔记 Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete note")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      toast.success("笔记已删除")
      setIsOpen(false)
      if (onDelete) onDelete()
    },
    onError: () => {
      toast.error("删除笔记失败")
    },
  })

  // 权限判断
  const currentUserRole = collaborators?.find(c => c.userId === session?.user?.id)?.role || note.role
  const isOwner = currentUserRole === "OWNER"
  const isAdmin = currentUserRole === "ADMIN"
  const isEditor = currentUserRole === "EDITOR"
  
  const canEditTitle = isOwner || isAdmin || isEditor
  const canManageMembers = isOwner || isAdmin
  const canDelete = isOwner

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
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
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">标题</Label>
                <div className="flex gap-2">
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!canEditTitle}
                    className="flex-1"
                  />
                  {canEditTitle && title !== note.title && (
                    <Button 
                        size="sm" 
                        onClick={() => updateTitleMutation.mutate(title)}
                        disabled={updateTitleMutation.isPending}
                    >
                        {updateTitleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">创建时间</span>
                  <span>{note.createdAt ? format(new Date(note.createdAt), "yyyy年MM月dd日 HH:mm", { locale: zhCN }) : "未知"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">最后更新</span>
                  <span>{format(new Date(note.updatedAt), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">所有者</span>
                  <span>{collaborators?.find(c => c.role === "OWNER")?.user.name || "加载中..."}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">当前权限</span>
                  <Badge variant="outline" className="w-fit">
                    {currentUserRole === "OWNER" && "所有者"}
                    {currentUserRole === "ADMIN" && "管理员"}
                    {currentUserRole === "EDITOR" && "编辑者"}
                    {currentUserRole === "VIEWER" && "访客"}
                  </Badge>
                </div>
              </div>

              {canDelete && (
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
                    删除笔记
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 成员管理 Tab */}
          <TabsContent value="members" className="py-4">
            {isLoadingCollaborators ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {collaborators?.map((collaborator) => (
                    <div key={collaborator.userId} className="flex items-center justify-between space-x-4 p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={collaborator.user.image || ""} />
                          <AvatarFallback>{collaborator.user.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {collaborator.user.name || "Unknown User"}
                            {collaborator.userId === session?.user?.id && " (你)"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{collaborator.user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={
                            collaborator.role === "OWNER" ? "default" : 
                            collaborator.role === "ADMIN" ? "secondary" : "outline"
                        }>
                            {collaborator.role === "OWNER" && "所有者"}
                            {collaborator.role === "ADMIN" && "管理员"}
                            {collaborator.role === "EDITOR" && "编辑者"}
                            {collaborator.role === "VIEWER" && "访客"}
                        </Badge>

                        {/* 权限控制逻辑 */}
                        {canManageMembers && collaborator.role !== "OWNER" && collaborator.userId !== session?.user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: collaborator.userId, role: "VIEWER" })}>
                                <Shield className="mr-2 h-4 w-4" /> 设为访客
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: collaborator.userId, role: "EDITOR" })}>
                                <Shield className="mr-2 h-4 w-4" /> 设为编辑者
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: collaborator.userId, role: "ADMIN" })}>
                                <Shield className="mr-2 h-4 w-4" /> 设为管理员
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => removeCollaboratorMutation.mutate({ userId: collaborator.userId })}
                              >
                                <UserX className="mr-2 h-4 w-4" /> 移除成员
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {!canManageMembers && (
                    <p className="text-xs text-center text-muted-foreground">
                        仅所有者和管理员可管理成员
                    </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
