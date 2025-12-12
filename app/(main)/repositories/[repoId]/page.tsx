"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { NoteList } from "@/components/editor/note-list"
import { NoteDetail } from "@/components/editor/note-detail"
import { ResizableLayout } from "@/components/layout/resizable-layout"
import { FileText } from "lucide-react"

export default function RepositoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const repoId = params?.repoId as string
  const noteId = searchParams.get("noteId")

  const { data: repository } = useQuery({
    queryKey: ["repository", repoId],
    queryFn: async () => {
      const res = await fetch(`/api/repositories/${repoId}`)
      if (!res.ok) throw new Error("Failed to fetch repository")
      const data = await res.json()
      return data.data
    },
    enabled: !!repoId
    ,staleTime: 1000 * 60 // 1 minute cache for repo details
  })

  const handleNoteDelete = () => {
    // 删除后清除 noteId 参数，回到列表初始状态
    router.push(`/repositories/${repoId}`)
  }

  return (
    <ResizableLayout
      sidebar={<NoteList repositoryId={repoId} />}
    >
      {noteId ? (
        <NoteDetail 
          key={noteId} // 添加 key 以强制重新渲染组件当 noteId 变化时
          noteId={noteId} 
          repositoryId={repoId}
          isDefaultRepository={repository?.isDefault}
          onDeleteSuccess={handleNoteDelete}
        />
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
