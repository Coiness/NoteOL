"use client"

import { Editor } from "@tiptap/react"
import { useTableOfContents } from "./hooks/use-table-of-contents"
import { cn } from "@/lib/utils"
import { List } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface TableOfContentsProps {
  editor: Editor
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const items = useTableOfContents(editor)
  const [isOpen, setIsOpen] = useState(false)

  const handleItemClick = (pos: number) => {
    // 稍微偏移一点，避免标题被顶部遮挡
    // 这里我们简单地设置光标位置并滚动
    editor.chain().focus().setTextSelection(pos).run()
    
    // 滚动到视图中
    const dom = editor.view.domAtPos(pos).node as HTMLElement
    if (dom && dom.scrollIntoView) {
        dom.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    
    setIsOpen(false)
  }

  if (items.length === 0) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="大纲">
          <List className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[340px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>大纲</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-1">
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
      </SheetContent>
    </Sheet>
  )
}
