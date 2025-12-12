"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Crown, Shield, Eye, UserMinus, UserPlus } from "lucide-react"
import { Collaborator } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MemberManagementProps {
  noteId: string
  collaborators?: Collaborator[]
  isLoadingCollaborators: boolean
  canManageMembers: boolean
  onUpdateRole: (params: { userId: string; role: string }) => void
  onRemoveCollaborator: (params: { userId: string }) => void
  currentUserId?: string
}

export function MemberManagement({
  noteId,
  collaborators,
  isLoadingCollaborators,
  canManageMembers,
  onUpdateRole,
  onRemoveCollaborator,
  currentUserId,
}: MemberManagementProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "ADMIN":
        return <Shield className="h-4 w-4 text-blue-500" />
      case "EDITOR":
        return <UserPlus className="h-4 w-4 text-green-500" />
      case "VIEWER":
        return <Eye className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Badge variant="default" className="bg-yellow-500/80 hover:bg-yellow-500/80">所有者</Badge>
      case "ADMIN":
        return <Badge variant="secondary">管理员</Badge>
      case "EDITOR":
        return <Badge variant="outline" className="border-green-500 text-green-500">编辑者</Badge>
      case "VIEWER":
        return <Badge variant="outline" className="text-muted-foreground">访客</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">协作者</h4>
        {canManageMembers && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                邀请成员
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>邀请协作者</DialogTitle>
                <DialogDescription>
                  输入邮箱地址来邀请新协作者加入此笔记。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>权限</Label>
                  <Select defaultValue="VIEWER">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">访客 - 只能查看</SelectItem>
                      <SelectItem value="EDITOR">编辑者 - 可以编辑</SelectItem>
                      <SelectItem value="ADMIN">管理员 - 可以管理成员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  取消
                </Button>
                <Button onClick={() => {
                  // TODO: 实现邀请逻辑
                  setIsInviteOpen(false)
                  setInviteEmail("")
                }}>
                  发送邀请
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoadingCollaborators ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators?.map((collaborator) => (
            <div key={collaborator.userId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={collaborator.user.image || ""} />
                  <AvatarFallback>
                    {collaborator.user.name?.charAt(0) || collaborator.user.email?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{collaborator.user.name || collaborator.user.email}</span>
                    {getRoleIcon(collaborator.role)}
                  </div>
                  <div className="text-xs text-muted-foreground">{collaborator.user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getRoleBadge(collaborator.role)}

                {canManageMembers && collaborator.userId !== currentUserId && (
                  <div className="flex items-center gap-1">
                    <Select
                      value={collaborator.role}
                      onValueChange={(role) => onUpdateRole({ userId: collaborator.userId, role })}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">访客</SelectItem>
                        <SelectItem value="EDITOR">编辑者</SelectItem>
                        <SelectItem value="ADMIN">管理员</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`确定要移除 ${collaborator.user.name || collaborator.user.email} 的协作者权限吗？`)) {
                          onRemoveCollaborator({ userId: collaborator.userId })
                        }
                      }}
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(!collaborators || collaborators.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无协作者</p>
              <p className="text-xs">邀请他人协作编辑此笔记</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}