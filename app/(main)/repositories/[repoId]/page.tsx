"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { NoteList } from "@/components/editor/note-list"
import { NoteDetail } from "@/components/editor/note-detail"
import { FileText } from "lucide-react"

export default function RepositoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const repoId = params?.repoId as string
  const noteId = searchParams.get("noteId")

  const handleNoteDelete = () => {
    // 删除后清除 noteId 参数，回到列表初始状态
    router.push(`/repositories/${repoId}`)
  }

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <aside className="w-80 hidden md:block h-full border-r bg-background">
        <NoteList repositoryId={repoId} />
      </aside>
      
      {/* 右侧内容 */}
      <main className="flex-1 h-full overflow-hidden bg-background">
        {noteId ? (
          <NoteDetail 
            key={noteId} // 添加 key 以强制重新渲染组件当 noteId 变化时
            noteId={noteId} 
            onDeleteSuccess={handleNoteDelete}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">选择或创建一个笔记</p>
            <p className="text-sm">在左侧列表中选择笔记开始编辑</p>
          </div>
        )}
      </main>
    </div>
  )
}
