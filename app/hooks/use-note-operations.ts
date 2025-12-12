"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useOffline } from "@/app/hooks/use-offline"

interface UseNoteOperationsProps {
  repositoryId?: string
}

export function useNoteOperations({ repositoryId }: UseNoteOperationsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // 离线功能
  const { isOnline, createOfflineNote } = useOffline()

  // 创建新笔记 (支持离线)
  const createMutation = useMutation({
    mutationFn: async () => {
      // 如果在线，尝试直接创建
      if (isOnline) {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "无标题笔记",
            repositoryId: repositoryId // 传入当前知识库ID
          }),
        })
        if (!res.ok) throw new Error("Failed to create note")
        return res.json()
      } else {
        // 如果离线，创建本地笔记
        const offlineNote = await createOfflineNote({
          title: "无标题笔记",
          repositoryId: repositoryId
        })
        return { data: offlineNote, isOffline: true }
      }
    },
    onSuccess: async (data) => {
      // 只刷新与当前 repository 相关的 notes 查询，避免全量刷新
      if (repositoryId) {
        queryClient.invalidateQueries({ queryKey: ["notes", repositoryId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ["notes"] })
      }

      // 获取实际要跳转的 repositoryId
      let targetRepositoryId = repositoryId
      if (!targetRepositoryId) {
        // 如果没有指定 repositoryId，需要获取默认知识库的ID
        try {
          const res = await fetch("/api/repositories")
          if (res.ok) {
            const repoData = await res.json()
            const defaultRepo = repoData.data?.find((repo: any) => repo.isDefault)
            if (defaultRepo) {
              targetRepositoryId = defaultRepo.id
            }
          }
        } catch (error) {
          console.error("Failed to fetch default repository:", error)
        }
      }

      // 刷新相关查询
      if (targetRepositoryId) {
        queryClient.invalidateQueries({ queryKey: ["notes", targetRepositoryId] })
      }
      queryClient.invalidateQueries({ queryKey: ["notes"] })

      if (data.isOffline) {
        // 离线创建的笔记，使用本地ID
        toast.success("笔记已创建 (离线模式)")
        if (targetRepositoryId) {
          router.push(`/repositories/${targetRepositoryId}?noteId=${data.data.id}`)
        } else {
          router.push(`/notes/${data.data.id}`)
        }
      } else {
        // 在线创建的笔记，使用服务器ID
        if (targetRepositoryId) {
          router.push(`/repositories/${targetRepositoryId}?noteId=${data.data.id}`)
        } else {
          router.push(`/notes/${data.data.id}`)
        }
      }
    },
    onError: (error) => {
      console.error("Failed to create note:", error)
      toast.error(isOnline ? "创建笔记失败" : "离线模式下无法创建笔记")
    },
  })

  return {
    createMutation,
    isOnline,
  }
}