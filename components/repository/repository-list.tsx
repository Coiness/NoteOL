/**
 * 知识库展示列表
 */

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Loader2, Folder, MoreVertical, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RepositoryDialog } from "./repository-dialog"
import { Repository } from "@/types"

export function RepositoryList() {
  const queryClient = useQueryClient()
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null)
  const [deletingRepo, setDeletingRepo] = useState<Repository | null>(null)

  const { data: repositories, isLoading } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories")
      if (!res.ok) throw new Error("Failed to fetch repositories")
      const data = await res.json()
      return data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/repositories/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "删除失败")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
      toast.success("知识库已删除")
      setDeletingRepo(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <RepositoryDialog 
        open={!!editingRepo} 
        onOpenChange={(open) => !open && setEditingRepo(null)}
        repository={editingRepo || undefined}
        trigger={<span className="hidden" />}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 空状态或添加按钮 */}
        <RepositoryDialog 
          trigger={
            <Button variant="outline" className="h-full min-h-40 flex flex-col gap-2 border-dashed hover:border-primary hover:bg-accent/50">
              <Folder className="h-8 w-8 text-muted-foreground" />
              <span>新建知识库</span>
            </Button>
          }
        />
        
        {repositories?.map((repo) => (
          <Card key={repo.id} className="group relative hover:shadow-md transition-shadow select-none">
            <Link href={`/repositories/${repo.id}`} className="absolute inset-0 z-10">
              <span className="sr-only">查看 {repo.name}</span>
            </Link>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: repo.color || "#94a3b8" }}
                  />
                  <CardTitle className="line-clamp-1">
                    {repo.name}
                  </CardTitle>
                </div>
                {!repo.isDefault && (
                  <div className="z-20 relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">菜单</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingRepo(repo)}>
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingRepo(repo)} 
                          className="text-red-600"
                        >
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
              <CardDescription className="line-clamp-2 h-10">
                {repo.description || "暂无描述"}
              </CardDescription>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  更新于 {formatDistanceToNow(new Date(repo.updatedAt), { addSuffix: true, locale: zhCN })}
                </span>
                {repo.isDefault && (
                  <span className="bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">
                    默认
                  </span>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deletingRepo} onOpenChange={(open) => !open && setDeletingRepo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该知识库 &quot;{deletingRepo?.name}&quot;。
              该知识库下的笔记不会被删除，但会失去该分类。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingRepo && deleteMutation.mutate(deletingRepo.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
