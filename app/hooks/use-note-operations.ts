"use client"

import { useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useOffline } from "@/app/hooks/use-offline"
import { useStore } from "@/store/useStore"
import { noteService } from "@/lib/services/note-service"

interface UseNoteOperationsProps {
  repositoryId?: string
}

/**
 * useNoteOperations Hook
 * 
 * 封装笔记相关的操作逻辑，目前主要用于创建新笔记。
 * 
 * 核心功能:
 * 1. 创建笔记 (createNote):
 *    - 支持离线创建 (生成 local_ ID)
 *    - 自动关联到当前或默认知识库
 *    - 创建成功后自动跳转到编辑页
 *    - 自动刷新相关列表缓存
 * 
 * @param {UseNoteOperationsProps} props - 配置参数
 * @param {string} [props.repositoryId] - 当前所在的知识库 ID (如果有)
 * 
 * @returns {Object} - 包含操作方法和状态的对象
 */
export function useNoteOperations({ repositoryId }: UseNoteOperationsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const defaultRepositoryId = useStore(state => state.defaultRepositoryId)

  // 离线功能 (仅用于获取在线状态)
  const { isOnline } = useOffline()

  // 创建新笔记 (统一使用 NoteService)
  const createMutation = useMutation({
    mutationFn: async () => {
      // 无论在线还是离线，都调用 noteService.createNote
      // NoteService 内部会先写 IDB，后台自动同步
      const newNote = await noteService.createNote({
        title: "无标题笔记",
        // 传入 noteRepositories 结构以适配 NoteService
        noteRepositories: repositoryId ? [{ repositoryId } as any] : []
      })
      
      // 检查是否是离线生成的ID (以 local_ 开头)
      const isOfflineId = newNote.id.startsWith('local_')
      
      return { data: newNote, isOffline: isOfflineId }
    },
    onSuccess: async (data) => {
      // 只刷新与当前 repository 相关的 notes 查询，避免全量刷新
      if (repositoryId) {
        queryClient.invalidateQueries({ queryKey: ["notes", repositoryId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ["notes"] })
      }

      // 获取实际要跳转的 repositoryId
      let targetRepositoryId = repositoryId || defaultRepositoryId
      if (!targetRepositoryId) {
        // 如果没有指定 repositoryId，需要获取默认知识库的ID
        try {
          // 这里的 fetch 也可以考虑未来移入 RepositoryService
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
          // 如果实在找不到知识库ID，跳转到知识库列表页
          router.push(`/repositories?noteId=${data.data.id}`)
        }
      } else {
        // 在线创建的笔记，使用服务器ID
        // 注意：NoteService 的 createNote 返回的即使是在线同步后的数据，ID 也可能是 local_ 开头（如果还没来得及同步回来）
        // 但如果是在线状态，后台 sync 很快，这里我们主要依赖 isOffline 判断
        if (targetRepositoryId) {
          router.push(`/repositories/${targetRepositoryId}?noteId=${data.data.id}`)
        } else {
          router.push(`/repositories?noteId=${data.data.id}`)
        }
      }
    },
    onError: (error) => {
      console.error("Failed to create note:", error)
      toast.error("创建笔记失败")
    },
  })

  return {
    createNote: createMutation.mutate,
    isCreating: createMutation.isPending,
  }
}
