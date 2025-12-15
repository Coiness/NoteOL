"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { useOffline } from "@/app/hooks/use-offline"
import { useEffect } from "react"
interface UseNoteOperationsProps {
  repositoryId?: string
}

export function useNoteOperations({ repositoryId }: UseNoteOperationsProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  // 离线功能
  const { isOnline, createOfflineNote } = useOffline()

  console.log('[useNoteOperations] 初始化，当前网络状态 isOnline:', isOnline)

  // 创建新笔记 (支持离线)
  const createMutation = useMutation({
    mutationFn: async (variables?: any) => {
      console.log('=== MUTATION_FN 被调用了！时间戳:', Date.now(), '变量:', variables, '===')
      return { success: true, timestamp: Date.now() }
    },
    onSuccess: (data) => {
      console.log('[测试] onSuccess 被调用，data:', data)
    },
    onError: (error) => {
      console.log('[测试] onError 被调用，error:', error)
    }
  })

  // 原始的创建逻辑
  const realCreateMutation = useMutation({
    mutationFn: async () => {
      console.log('[创建笔记] mutationFn 开始执行，isOnline:', isOnline, 'repositoryId:', repositoryId)
      console.log('[创建笔记] 当前时间戳:', Date.now())

      // 检查 mutation 是否被禁用
      console.log('[创建笔记] 检查 mutation 状态:', {
        isPending: realCreateMutation.isPending,
        isError: realCreateMutation.isError,
        isSuccess: realCreateMutation.isSuccess,
        status: realCreateMutation.status
      })

      // 实际测试网络连通性
      let actualOnline = false
      try {
        console.log('[创建笔记] 测试实际网络连通性...')
        const testResponse = await fetch('/api/repositories', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000) // 3秒超时
        })
        actualOnline = testResponse.ok
        console.log('[创建笔记] 网络连通性测试结果:', actualOnline, '状态码:', testResponse.status)
      } catch (error) {
        console.log('[创建笔记] 网络连通性测试失败:', error instanceof Error ? error.message : String(error))
        actualOnline = false
      }

      // 如果在线，尝试直接创建
      if (actualOnline) {
        console.log('[创建笔记] 实际在线，调用 /api/notes')
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "无标题笔记",
            repositoryId: repositoryId // 传入当前知识库ID
          }),
        })
        console.log('[创建笔记] API 响应:', res.status, res.ok)
        if (!res.ok) throw new Error("Failed to create note")
        return res.json()
      } else {
        console.log('[创建笔记] 实际离线，创建本地笔记')
        // 如果离线，创建本地笔记
        const offlineNote = await createOfflineNote({
          title: "无标题笔记",
          repositoryId: repositoryId
        }, session?.user?.id || '')
        console.log('[创建笔记] 离线笔记创建完成:', offlineNote.id)
        return { data: offlineNote, isOffline: true }
      }
    },
    onSuccess: async (data) => {
      console.log('[创建笔记] onSuccess 开始，data:', data)

      // 只刷新与当前 repository 相关的 notes 查询，避免全量刷新
      if (repositoryId) {
        console.log('[创建笔记] 刷新当前知识库的查询缓存')
        queryClient.invalidateQueries({ queryKey: ["notes", repositoryId] })
      } else {
        console.log('[创建笔记] 刷新所有笔记查询缓存')
        queryClient.invalidateQueries({ queryKey: ["notes"] })
      }

      // 获取实际要跳转的 repositoryId
      let targetRepositoryId = repositoryId
      if (!targetRepositoryId) {
        console.log('[创建笔记] 需要获取默认知识库ID')
        // 如果没有指定 repositoryId，需要获取默认知识库的ID
        try {
          const res = await fetch("/api/repositories")
          console.log('[创建笔记] 获取知识库列表响应:', res.status, res.ok)
          if (res.ok) {
            const repoData = await res.json()
            const defaultRepo = repoData.data?.find((repo: any) => repo.isDefault)
            if (defaultRepo) {
              targetRepositoryId = defaultRepo.id
              console.log('[创建笔记] 找到默认知识库:', defaultRepo.id)
            } else {
              console.log('[创建笔记] 未找到默认知识库')
            }
          }
        } catch (error) {
          console.error("Failed to fetch default repository:", error)
        }
      }

      // 刷新相关查询
      if (targetRepositoryId) {
        console.log('[创建笔记] 再次刷新目标知识库查询缓存')
        queryClient.invalidateQueries({ queryKey: ["notes", targetRepositoryId] })
      }
      console.log('[创建笔记] 刷新所有笔记查询缓存')
      queryClient.invalidateQueries({ queryKey: ["notes"] })

      if (data.isOffline) {
        // 离线创建的笔记，使用本地ID
        console.log('[创建笔记] 离线模式，跳转到:', targetRepositoryId ? `/repositories/${targetRepositoryId}?noteId=${data.data.id}` : `/notes/${data.data.id}`)
        toast.success("笔记已创建 (离线模式)")
        if (targetRepositoryId) {
          router.push(`/repositories/${targetRepositoryId}?noteId=${data.data.id}`)
        } else {
          router.push(`/notes/${data.data.id}`)
        }
      } else {
        // 在线创建的笔记，使用服务器ID
        console.log('[创建笔记] 在线模式，跳转到:', targetRepositoryId ? `/repositories/${targetRepositoryId}?noteId=${data.data.id}` : `/notes/${data.data.id}`)
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

  console.log('[useNoteOperations] mutation 创建完成，mutation 对象:', createMutation)

  // 添加调试信息
  useEffect(() => {
    console.log('[useNoteOperations] mutation 状态变化:', {
      isPending: createMutation.isPending,
      isError: createMutation.isError,
      isSuccess: createMutation.isSuccess,
      data: createMutation.data,
      error: createMutation.error,
      failureCount: createMutation.failureCount,
      failureReason: createMutation.failureReason,
      status: createMutation.status
    })
  }, [createMutation.isPending, createMutation.isError, createMutation.isSuccess, createMutation.data, createMutation.error, createMutation.failureCount, createMutation.failureReason, createMutation.status])

  return {
    createMutation,
    isOnline,
  }
}