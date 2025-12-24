import { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'

export interface TocItem {
  id: string
  text: string
  level: number
  pos: number
}

/**
 * useTableOfContents Hook
 * 
 * 用于从 Tiptap 编辑器实例中提取目录结构。
 * 实时监听编辑器内容变化，并自动解析所有标题 (h1-h6)。
 * 
 * @param {Editor | null} editor - Tiptap 编辑器实例
 * @returns {TocItem[]} - 包含标题信息的目录项数组
 * 
 * @example
 * const editor = useEditor(...)
 * const toc = useTableOfContents(editor)
 * 
 * return (
 *   <ul>
 *     {toc.map(item => (
 *       <li key={item.id} onClick={() => scrollTo(item.pos)}>{item.text}</li>
 *     ))}
 *   </ul>
 * )
 */
export const useTableOfContents = (editor: Editor | null) => {
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    if (!editor) {
      return
    }

    const updateToc = () => {
      const newItems: TocItem[] = []

      // 遍历文档节点，查找 heading 类型的节点
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