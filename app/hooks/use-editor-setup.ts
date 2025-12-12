"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDebounce } from "@/app/hooks/use-debounce"
import { useOffline } from "@/app/hooks/use-offline"
import { Note } from "@/types"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { IndexeddbPersistence } from "y-indexeddb"

interface UseEditorSetupProps {
  noteId: string
  repositoryId?: string
  isDefaultRepository?: boolean
  onDeleteSuccess?: () => void
}

export function useEditorSetup({ noteId, repositoryId, isDefaultRepository, onDeleteSuccess }: UseEditorSetupProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState(0)

  // Determine if we are in "Remove" mode (Custom Repository) or "Delete" mode (Default Repo / All Notes)
  const isRemoveMode = !!repositoryId && !isDefaultRepository

  // Y.js State
  const [yDoc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [isSynced, setIsSynced] = useState(false)

  // 自动保存防抖
  const debouncedTags = useDebounce(tags, 1000)

  // 记录是否是首次加载，避免首次加载触发自动保存
  const isFirstLoad = useRef(true)

  // 离线功能
  const { getOfflineNote } = useOffline()

  // 检查是否是离线笔记
  const isOfflineNote = noteId?.startsWith('local_')

  // 获取笔记详情
  const { data: note, isLoading, isError } = useQuery<Note>({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (isOfflineNote) {
        // 从 IndexedDB 加载离线笔记
        const offlineNote = await getOfflineNote(noteId!)
        if (!offlineNote) throw new Error("Offline note not found")
        return {
          ...offlineNote,
          role: "OWNER",
          isOffline: true,
          createdAt: offlineNote.createdAt.toISOString(),
          updatedAt: offlineNote.updatedAt.toISOString(),
          tags: offlineNote.tags.map(tag => ({
            id: tag,
            name: tag,
            userId: "",
            createdAt: offlineNote.createdAt.toISOString()
          }))
        } as Note
      } else {
        // 从服务器加载在线笔记
        const res = await fetch(`/api/notes/${noteId}`)
        if (!res.ok) throw new Error("Failed to fetch note")
        const data = await res.json()
        return data.data
      }
    },
    staleTime: 1000 * 10, // 10秒内不重新请求
    refetchOnWindowFocus: false,
    enabled: !!noteId, // 只有当 noteId 存在时才查询
  })

  // 权限判断
  const role = isOfflineNote ? "OWNER" : (note?.role || "VIEWER")
  const isReadOnly = role === "VIEWER"
  const canShare = ["OWNER", "ADMIN"].includes(role)
  const canDelete = role === "OWNER" || (isRemoveMode && ["OWNER", "ADMIN", "EDITOR"].includes(role))

  // 初始化 Y.js Provider
  useEffect(() => {
    let wsProvider: HocuspocusProvider | null = null
    let indexeddbProvider: IndexeddbPersistence | null = null

    const init = async () => {
      // 1. 离线存储 (立即生效)
      try {
        indexeddbProvider = new IndexeddbPersistence(noteId + '_v1', yDoc)
        indexeddbProvider.on('synced', () => {
          console.log('Content loaded from IndexedDB')
        })
      } catch (err) {
        console.error('[IndexedDB] failed to initialize', err)
        // 尝试清理
        try {
            if (typeof indexedDB !== 'undefined') {
                indexedDB.deleteDatabase('yjs')
            }
        } catch (e) {}
        indexeddbProvider = null
      }

      // 2. 获取 Token 并连接 WebSocket
      try {
        const res = await fetch(`/api/collaboration/auth?noteId=${noteId}`)
        if (!res.ok) throw new Error('Failed to get auth token')
        const { token, role: wsRole } = await res.json()

        wsProvider = new HocuspocusProvider({
          url: `ws://localhost:1234`,
          name: noteId,
          token,
          document: yDoc,
          onStatus: (data) => {
            setStatus(data.status)
          },
          onSynced: () => {
            setIsSynced(true)
          },
        })

        setProvider(wsProvider)
      } catch (error) {
        console.error('Failed to connect to collaboration server:', error)
        setStatus('disconnected')
        toast.error("连接协作服务失败，将仅在本地保存")
      }
    }

    init()

    return () => {
      if (wsProvider) wsProvider.destroy()
      if (indexeddbProvider) indexeddbProvider.destroy()
    }
  }, [noteId, yDoc])

  // 监听在线用户数
  useEffect(() => {
    if (!provider || !provider.awareness) return

    const updateUsers = () => {
      if (provider.awareness) {
        setOnlineUsers(provider.awareness.getStates().size)
      }
    }

    provider.awareness.on('change', updateUsers)
    updateUsers() // 初始化

    return () => {
      provider.awareness?.off('change', updateUsers)
    }
  }, [provider])

  // 监听 Y.js 标题变化
  useEffect(() => {
    const yTitle = yDoc.getText('title')

    const observer = () => {
      setTitle(yTitle.toString())
    }

    yTitle.observe(observer)

    // 初始值同步
    if (yTitle.length > 0) {
        setTitle(yTitle.toString())
    }

    return () => yTitle.unobserve(observer)
  }, [yDoc])

  // 初始化本地状态 (从 API 获取的数据)
  useEffect(() => {
    if (note && isSynced) {
      // 只有当 Y.js 同步完成且标题为空时，才使用 API 数据初始化
      const yTitle = yDoc.getText('title')
      if (yTitle.length === 0 && note.title) {
          yDoc.transact(() => {
              yTitle.insert(0, note.title)
          })
      }

      const newTags = note.tags?.map(t => t.name) || []
      setTags(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newTags)) {
          return newTags
        }
        return prev
      })

      setTimeout(() => {
        isFirstLoad.current = false
      }, 100)
    }
  }, [note, yDoc, isSynced])

  // 处理标题变更
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setTitle(newTitle)

      const yTitle = yDoc.getText('title')
      if (yTitle.toString() !== newTitle) {
          yDoc.transact(() => {
              yTitle.delete(0, yTitle.length)
              yTitle.insert(0, newTitle)
          })
      }
  }

  // 保存笔记 Mutation (支持离线保存)
  const saveMutation = useMutation({
    mutationFn: async (data: { tags: string[] }) => {
      if (isOfflineNote) {
        // 离线笔记：保存到 IndexedDB
        const offlineNote = await getOfflineNote(noteId!)
        if (offlineNote) {
          offlineNote.tags = data.tags
          offlineNote.updatedAt = new Date()
          // 这里应该更新 IndexedDB 中的笔记
          return { success: true }
        }
        throw new Error("Offline note not found")
      } else {
        // 在线笔记：调用服务器API
        const res = await fetch(`/api/notes/${noteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Failed to save note")
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", noteId] })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
    onError: () => {
      toast.error(isOfflineNote ? "离线保存失败" : "保存失败，请检查网络")
    },
  })

  // 监听防抖后的值变化，触发自动保存 (仅标签)
  useEffect(() => {
    if (isFirstLoad.current) return
    if (!note) return
    if (isReadOnly) return // 只读模式下不自动保存

    saveMutation.mutate({
      tags: debouncedTags
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTags])

  // 删除/移除笔记 Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isRemoveMode) {
          // Remove from repository
          const res = await fetch(`/api/repositories/${repositoryId}/notes/${noteId}`, {
            method: "DELETE",
          })
          if (!res.ok) throw new Error("Failed to remove note from repository")
      } else {
          // Delete note permanently
          const res = await fetch(`/api/notes/${noteId}`, {
            method: "DELETE",
          })
          if (!res.ok) throw new Error("Failed to delete note")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      if (isRemoveMode) {
          queryClient.invalidateQueries({ queryKey: ["repository-notes", repositoryId] })
          toast.success("笔记已从知识库移除")
      } else {
          toast.success("笔记已删除")
      }

      if (onDeleteSuccess) {
        onDeleteSuccess()
      } else {
        router.push(isRemoveMode ? `/repositories/${repositoryId}` : "/notes")
      }
    },
  })

  return {
    note,
    isLoading,
    isError,
    title,
    tags,
    onlineUsers,
    yDoc,
    provider,
    status,
    role,
    isReadOnly,
    canShare,
    canDelete,
    handleTitleChange,
    setTags,
    saveMutation,
    deleteMutation,
  }
}