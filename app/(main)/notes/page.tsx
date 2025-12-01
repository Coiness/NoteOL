import { FileText } from "lucide-react"

export default function NotesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <FileText className="h-16 w-16 mb-4 opacity-20" />
      <h3 className="text-lg font-medium">选择或创建一篇笔记</h3>
      <p className="text-sm">从左侧列表选择一篇笔记开始编辑</p>
    </div>
  )
}
