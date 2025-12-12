import { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'

export interface TocItem {
  id: string
  text: string
  level: number
  pos: number
}

export const useTableOfContents = (editor: Editor | null) => {
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    if (!editor) {
      return
    }

    const updateToc = () => {
      const newItems: TocItem[] = []

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          // 获取标题文本
          const text = node.textContent

          // 如果没有 ID，生成一个临时的（实际跳转我们用 pos）
          // 但为了 React key，我们需要唯一标识
          const id = `heading-${pos}`

          if (text.trim().length > 0) {
            newItems.push({
              id,
              text,
              level: node.attrs.level,
              pos,
            })
          }
        }
      })

      setItems(newItems)
    }

    // 初始获取
    updateToc()

    // 监听更新
    editor.on('update', updateToc)

    return () => {
      editor.off('update', updateToc)
    }
  }, [editor])

  return items
}