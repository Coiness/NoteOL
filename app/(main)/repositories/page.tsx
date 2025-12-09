import { Metadata } from "next"
import { RepositoryList } from "@/components/repository/repository-list"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "知识库管理 - NoteOL",
  description: "管理您的知识库分类",
}

export default function RepositoriesPage() {
  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2 overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">知识库</h2>
          <p className="text-muted-foreground">
            创建和管理您的知识库，对笔记进行分类整理。
          </p>
        </div>
      </div>
      <Separator />
      <RepositoryList />
    </div>
  )
}
