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
  Unlink,
  Folder,
  Plus,
  X
} from "lucide-react"
import { toast } from "sonner"
import { Note, Repository } from "@/types"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

interface NoteRepository {
    repository: Repository
}

export function NoteSettingsDialog({ note, trigger, onDelete }: NoteSettingsDialogProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRepoId, setSelectedRepoId] = useState<string>("")

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
  })

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
      setIsOpen(true) // 确保添加成功后面板保持打开
    },
    onError: (error) => {
        toast.error("添加失败")
    }
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

  // 过滤出尚未添加该笔记的知识库
  const availableRepos = repositories?.filter(repo => 
    !noteData?.noteRepositories?.some(nr => nr.repository.id === repo.id)
  ) || []


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
                <Label>标题</Label>
                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                    <span className="font-medium">{noteData?.title || note.title}</span>
                    <Badge variant="outline" className="text-xs">只读</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    标题只能在编辑器中修改
                </p>
              </div>

              <div className="space-y-2">
                <Label>所属知识库</Label>
                {isLoadingNote ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> 加载中...
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {noteData?.noteRepositories?.map((nr) => (
                                <Badge key={nr.repository.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                    <Folder className="h-3 w-3 mr-1" />
                                    {nr.repository.name}
                                    {nr.repository.isDefault ? (
                                        <span className="ml-1 text-[10px] text-muted-foreground">(默认)</span>
                                    ) : canManageRepos && (
                                        <button 
                                            onClick={() => removeFromRepoMutation.mutate(nr.repository.id)}
                                            className="ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </Badge>
                            ))}
                        </div>
                        
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
                                    disabled={!selectedRepoId}
                                    onClick={() => addToRepoMutation.mutate(selectedRepoId)}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> 添加
                                </Button>
                            </div>
                        )}
                    </div>
                )}
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
