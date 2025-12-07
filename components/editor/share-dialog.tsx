/**
 * 分享对话框组件
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Share2, Copy, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ShareDialogProps {
  noteId: string
  noteTitle: string
}

export function ShareDialog({ noteId, noteTitle }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [role, setRole] = useState<"VIEWER" | "EDITOR" | "ADMIN">("VIEWER")
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isCopied, setIsCopied] = useState(false)

  const createShareLink = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/collaboration/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, role }),
      })

      if (!res.ok) throw new Error("创建分享链接失败")

      const data = await res.json()
      setShareUrl(data.url)
    } catch (error) {
      toast.error("无法创建分享链接")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    toast.success("链接已复制")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // 重置状态
      setShareUrl("")
      setRole("VIEWER")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          分享
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享笔记</DialogTitle>
          <DialogDescription>
            生成一个链接，分享给其他人。他们登录后即可访问此笔记。
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          {!shareUrl ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role">权限设置</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="选择权限" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">只读 (Viewer)</SelectItem>
                    <SelectItem value="EDITOR">可编辑 (Editor)</SelectItem>
                    <SelectItem value="ADMIN">管理员 (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createShareLink} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                生成链接
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="link" className="sr-only">
                    Link
                  </Label>
                  <Input
                    id="link"
                    defaultValue={shareUrl}
                    readOnly
                    className="h-9"
                  />
                </div>
                <Button type="submit" size="sm" className="px-3" onClick={copyToClipboard}>
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">Copy</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                此链接包含 {role === "EDITOR" ? "编辑" : "只读"} 权限。
              </p>
              <Button variant="ghost" onClick={() => setShareUrl("")} className="self-start px-0">
                创建新链接
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
