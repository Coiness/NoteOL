"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { NoteList } from "@/components/editor/note-list"
import { NoteDetail } from "@/components/editor/note-detail"
import { OfflineNoteDetail } from "@/components/editor/offline-note-detail"
import { ResizableLayout } from "@/components/layout/resizable-layout"
import { FileText } from "lucide-react"
import { useOffline } from "@/app/hooks/use-offline"

export function RepositoryContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const repoId = params?.repoId as string
  const noteId = searchParams.get("noteId")

  // 获取离线功能
  const { isOnline, isReady, cacheRepository, getCachedRepository } = useOffline()

  // tips:知识库页的缓存
  const { data: repository, isLoading, error } = useQuery({
    queryKey: ["repository", repoId],
    queryFn: async () => {
      // 在线时从服务器获取并缓存
      if (isOnline) {
        const res = await fetch(`/api/repositories/${repoId}`)
        if (!res.ok) throw new Error("Failed to fetch repository")
        const data = await res.json()
        const repo = data.data

        // 缓存到 IndexedDB
        await cacheRepository(repo)

        return repo
      } else {
        // 离线时从缓存获取
        const cachedRepo = await getCachedRepository(repoId)
        if (cachedRepo) {
          return cachedRepo
        } else {
          // 无缓存数据，重定向到离线页面
          router.push('/offline?from=/repositories/' + repoId)
          return null
        }
      }
    },
    enabled: !!repoId && isReady,
    staleTime: 1000 * 60 // 1 minute cache for repo details
  })

  // 等待网络状态初始化
  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">初始化中...</p>
        </div>
      </div>
    )
  }

  const handleNoteDelete = () => {
    // 删除后清除 noteId 参数，回到列表初始状态
    // tips：没有组件处理吗？
    // 这是作为成功回调，成功后回到列表初始状态？
    router.push(`/repositories/${repoId}`)
  }

  // 处理加载状态
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载知识库中...</p>
        </div>
      </div>
    )
  }

  // 处理错误状态 - 只在在线状态下显示错误
  if (error && isOnline) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">加载知识库失败</p>
          <p className="text-sm text-muted-foreground mb-4">
            请检查网络连接或稍后重试
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // 如果离线且没有缓存数据，页面会重定向到 /offline，这里不应该显示
  // tips：没看懂
  if (!repository && !isOnline) {
    return null // 让重定向处理
  }

  return (
    <ResizableLayout
      sidebar={<NoteList repositoryId={repoId} />}
    >
      {noteId ? (
        (() => {
          const isOfflineNote = noteId.startsWith('local_')
          return isOfflineNote ? (
            <OfflineNoteDetail noteId={noteId} key={noteId} />
          ) : (
            // tips:noteDetail 又是何许人也
            // 原来就是我们的编辑器组件
            <NoteDetail
              key={noteId} // 添加 key 以强制重新渲染组件当 noteId 变化时
              noteId={noteId}
              repositoryId={repoId}
              isDefaultRepository={repository?.isDefault}
              onDeleteSuccess={handleNoteDelete}
            />
          )
        })()
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <FileText className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">选择或创建一个笔记</p>
          <p className="text-sm">在左侧列表中选择笔记开始编辑</p>
        </div>
      )}
    </ResizableLayout>
  )
}