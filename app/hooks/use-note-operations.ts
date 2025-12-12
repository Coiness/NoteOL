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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })

      if (data.isOffline) {
        // 离线创建的笔记，使用本地ID
        toast.success("笔记已创建 (离线模式)")
        router.push(`/repositories/${repositoryId}?noteId=${data.data.id}`)
      } else {
        // 在线创建的笔记，使用服务器ID
        router.push(`/repositories/${repositoryId}?noteId=${data.data.id}`)
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