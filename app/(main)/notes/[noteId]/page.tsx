// tips：这个路由是？
import { NoteDetail } from "@/components/editor/note-detail"
import { OfflineNoteDetail } from "@/components/editor/offline-note-detail"

interface PageProps {
  params: Promise<{ noteId: string }>
}

export const dynamic = 'force-dynamic'

export default async function NotePage(props: PageProps) {
  const params = await props.params
  const isOfflineNote = params.noteId?.startsWith('local_')

  if (isOfflineNote) {
    // 离线笔记：完全客户端渲染，不依赖RSC
    return (
      <div className="h-[calc(100vh-4rem)]">
        <OfflineNoteDetail noteId={params.noteId} key={params.noteId} />
      </div>
    )
  }

  // 正常笔记：使用RSC
  // tips:其实这页完全没用了，如果是动态路由的话
  return (
    <div className="h-[calc(100vh-4rem)]">
      <NoteDetail noteId={params.noteId} key={params.noteId} />
    </div>
  )
}
