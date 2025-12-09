"use client"

import { Editor } from "@tiptap/react"
import { useTableOfContents } from "./hooks/use-table-of-contents"
import { cn } from "@/lib/utils"

interface TableOfContentsProps {
  editor: Editor
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const items = useTableOfContents(editor)

  const handleItemClick = (pos: number) => {
    // 稍微偏移一点，避免标题被顶部遮挡
    // 这里我们简单地设置光标位置并滚动
    editor.chain().focus().setTextSelection(pos).run()
    
    // 滚动到视图中
    const dom = editor.view.domAtPos(pos).node as HTMLElement
    if (dom && dom.scrollIntoView) {
        dom.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (items.length === 0) {
    return (
        <div className="text-sm text-muted-foreground p-4">
            暂无大纲
        </div>
    )
  }

  return (
    <div className="w-full">
        <div className="font-medium mb-4 px-2">大纲</div>
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.pos)}
              className={cn(
                "text-left text-sm hover:bg-accent hover:text-accent-foreground py-1.5 px-2 rounded-sm transition-colors truncate",
                item.level === 1 && "font-semibold",
                item.level === 2 && "pl-4",
                item.level === 3 && "pl-8 text-muted-foreground",
                item.level > 3 && "pl-10 text-muted-foreground"
              )}
            >
              {item.text}
            </button>
          ))}
        </div>
    </div>
  )
}
