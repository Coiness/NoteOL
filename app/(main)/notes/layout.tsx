import { NoteList } from "@/components/editor/note-list"
import { ReactNode } from "react"

export default function NotesLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* 左侧列表 - 在移动端可能需要隐藏或做成抽屉 */}
      <aside className="w-80 hidden md:block h-full">
        <NoteList />
      </aside>
      
      {/* 右侧内容 */}
      <main className="flex-1 h-full overflow-hidden bg-background">
        {children}
      </main>
    </div>
  )
}
