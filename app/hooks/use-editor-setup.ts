"use client"

/**
 * useEditorSetup: 编辑器状态与逻辑封装 Hook
 * 
 * 核心职责:
 * 1. 初始化 Y.js 文档 (yDoc) 与 Provider (Hocuspocus + IndexedDB)
 * 2. 管理编辑器的加载状态、错误状态、权限判断 (Role)
 * 3. 协调 React 状态 (Title, Tags) 与 Y.js 共享状态的双向绑定
 * 4. 处理离线优先策略 (Offline First):
 *    - 优先加载本地 IndexedDB 数据
 *    - 自动检测网络状态并切换同步模式
 * 5. 提供保存 (Save) 和删除 (Delete) 的 Mutation 逻辑
 */

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Query } from "@tanstack/query-core"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDebounce } from "@/app/hooks/use-debounce"
import { useOffline } from "@/app/hooks/use-offline"
import { noteService } from "@/lib/services/note-service"
import { offlineManager } from "@/lib/offline-manager"
import { Note, Tag } from "@/types"
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
  const debouncedTitle = useDebounce(title, 1000)

  // 记录是否是首次加载，避免首次加载触发自动保存
  const isFirstLoad = useRef(true)
  // 记录当前已加载数据的笔记ID，防止离线模式下重复用旧数据覆盖新数据
  const loadedNoteId = useRef<string | null>(null)

  // 离线功能
  const { triggerGlobalRefresh } = useOffline()

  // 检查是否是离线笔记
  const isOfflineNote = noteId?.startsWith('local_')

  // 获取笔记详情
  const { data: note, isLoading, isError } = useQuery<Note>({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (isOfflineNote) {
        // 从 IndexedDB 加载离线笔记
        const offlineNote = await offlineManager.getNoteIndex(noteId!)
        if (!offlineNote) throw new Error("Offline note not found")
        return {
          ...offlineNote,
          role: "OWNER",
          isOffline: true,
          content: offlineNote.preview || '',
          createdAt: offlineNote.createdAt.toISOString(),
          updatedAt: offlineNote.updatedAt.toISOString(),
          tags: offlineNote.tags.map((tag: string) => ({
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
          url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || 'ws://localhost:1234',
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
      // 只有当本地状态与 Y.js 不一致时才更新，避免循环
      const newVal = yTitle.toString()
      setTitle(prev => {
        if (prev !== newVal) return newVal
        return prev
      })
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
    if (!note) return

    // 检查是否切换了笔记
    const isNewNote = loadedNoteId.current !== noteId
    
    if (isNewNote) {
      loadedNoteId.current = noteId
      
      // 首次加载：总是从 DB 同步
      const newTags = note.tags?.map(t => t.name) || []
      setTags(newTags)
    } else {
      // 同一个笔记的后续更新
      if (isOfflineNote) {
        // 【关键修复】离线模式下，本地状态是 Source of Truth。
        // 防止 saveMutation -> invalidate -> useQuery -> useEffect 流程导致的
        // "数据库旧数据覆盖本地新数据" 的 Bug。
        // 所以这里什么都不做，保持本地 tags 不变。
      } else {
        // 在线模式：可能由协作者修改，需要同步（这里可以进一步优化冲突逻辑，但暂且保持原样）
        const newTags = note.tags?.map(t => t.name) || []
        setTags(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newTags)) {

            return newTags
          }
          return prev
        })
      }
    }

    // 2. 初始化标题 (需要等待 Y.js 同步，以 Y.js 为准，但如果是离线笔记且 Y.js 为空，则使用 DB 标题)
    if (isSynced || isOfflineNote) {
      const yTitle = yDoc.getText('title')
      if (yTitle.length === 0 && note.title) {
          yDoc.transact(() => {
              yTitle.insert(0, note.title)
          })
      }
    }

    // 3. 标记首次加载完成 (移出 isSynced 判断，只要 note 加载了就允许 Tag 自动保存)
    if (isFirstLoad.current && note) {
      setTimeout(() => {
        isFirstLoad.current = false
      }, 1000)
    }
  }, [note, yDoc, isSynced, isOfflineNote, noteId])

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

          // 使用 NoteService 处理元数据更新
          // 离线模式下，立即更新索引以刷新列表
          if (isOfflineNote) {
             noteService.updateNote(noteId, { title: newTitle }).catch(console.error)
             triggerGlobalRefresh()
          }
      }
  }

  // 保存笔记 Mutation (统一调用 NoteService)
  const saveMutation = useMutation({
    mutationFn: async (data: { title?: string; tags?: string[] }) => {
      // 无论在线离线，统一走 NoteService
      // NoteService.updateNote 会处理 Y.js, Index 更新和 Server Sync
      
      // 构造 Partial<Note>，将 tags string[] 转换为 Tag[] 格式以匹配接口
      const updatePayload: Partial<Note> = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.tags !== undefined && { 
            tags: data.tags.map(t => ({ id: t, name: t, userId: '', createdAt: new Date().toISOString() })) 
        })
      }
      
      return noteService.updateNote(noteId, updatePayload)
    },
    onSuccess: (updatedNote) => {
      // 触发列表刷新
      triggerGlobalRefresh()
      
      // 更新当前笔记缓存
      queryClient.setQueryData(["note", noteId], (old: any) => ({ ...(old || {}), ...updatedNote }))
      
      // 更新所有 notes 查询中的该笔记条目
      const notesQueries = queryClient.getQueryCache().findAll({ predicate: (query: Query) => Array.isArray(query.queryKey) && query.queryKey[0] === "notes" })
      notesQueries.forEach(q => {
        queryClient.setQueryData(q.queryKey, (old: any) => {
          if (!old || !old.pages) return old
          const pages = old.pages.map((page: any) => ({
            ...page,
            notes: page.notes.map((n: any) => n.id === updatedNote.id ? { ...n, ...updatedNote } : n)
          }))
          return { ...old, pages }
        })
      })
    },
    onError: () => {
      toast.error(isOfflineNote ? "离线保存失败" : "保存失败，请检查网络")
    },
  })

  // 监听防抖后的值变化，触发自动保存 (仅标签)
  useEffect(() => {
    if (isFirstLoad.current) {
      return
    }
    if (!note) {
      return
    }
    if (isReadOnly) {
      return 
    }
    // 只有当 tags 真正改变时才保存
    const existingTags = note?.tags?.map(t => t.name).sort().join(',') || ''
    const newTags = debouncedTags?.slice().sort().join(',') || ''
    if (existingTags === newTags) {
      return
    }
    saveMutation.mutate({ tags: debouncedTags })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTags])

  // 监听防抖后的标题变化，触发自动保存 (仅在线笔记)
  useEffect(() => {
    if (isFirstLoad.current) return
    if (!note) return
    if (isReadOnly) return
    if (isOfflineNote) return // 离线笔记已在 handleTitleChange 中处理

    // 只有当标题真正改变时才保存
    if (note.title !== debouncedTitle) {
      saveMutation.mutate({
        title: debouncedTitle
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle])

  // 删除/移除笔记 Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isRemoveMode) {
          // Remove from repository (Still API based for now as it's a relation change)
          const res = await fetch(`/api/repositories/${repositoryId}/notes/${noteId}`, {
            method: "DELETE",
          })
          if (!res.ok) throw new Error("Failed to remove note from repository")
      } else {
          // Delete note permanently (Unified Service)
          await noteService.deleteNote(noteId)
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
        console.log("删除笔记后，跳转到知识库列表页")
        router.push(repositoryId ? `/repositories/${repositoryId}` : "/repositories")
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