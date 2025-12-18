import { NoteList } from "@/components/editor/note-list"
import { ResizableLayout } from "@/components/layout/resizable-layout"
import { ReactNode, Suspense } from "react"

export default function NotesLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    // tips:哈哈，你也来个notelist没绷住
    <ResizableLayout
      sidebar={
        <Suspense fallback={<div className="p-4">加载中...</div>}>
          <NoteList />
        </Suspense>
      }
    >
      {children}
    </ResizableLayout>
  )
}
