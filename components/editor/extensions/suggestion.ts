import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Code, 
  Quote, 
  Minus,
  Image as ImageIcon,
  Table
} from 'lucide-react'
import { CommandList } from './command-list'

export const suggestion = {
  items: ({ query }: { query: string }) => {
    return [
      {
        title: '一级标题',
        description: '大标题',
        searchTerms: ['h1', 'heading1', 'biaoti'],
        icon: Heading1,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        },
      },
      {
        title: '二级标题',
        description: '中标题',
        searchTerms: ['h2', 'heading2', 'biaoti'],
        icon: Heading2,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        },
      },
      {
        title: '三级标题',
        description: '小标题',
        searchTerms: ['h3', 'heading3', 'biaoti'],
        icon: Heading3,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
        },
      },
      {
        title: '无序列表',
        description: '创建一个简单的列表',
        searchTerms: ['ul', 'list', 'liebiao'],
        icon: List,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: '有序列表',
        description: '创建一个带序号的列表',
        searchTerms: ['ol', 'ordered', 'liebiao'],
        icon: ListOrdered,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        },
      },
      {
        title: '任务列表',
        description: '创建一个待办事项列表',
        searchTerms: ['todo', 'task', 'renwu'],
        icon: CheckSquare,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run()
        },
      },
      {
        title: '引用',
        description: '引用一段文字',
        searchTerms: ['quote', 'yinyong'],
        icon: Quote,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        },
      },
      {
        title: '代码块',
        description: '插入一段代码',
        searchTerms: ['code', 'daima'],
        icon: Code,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        },
      },
      {
        title: '分割线',
        description: '插入一条水平分割线',
        searchTerms: ['hr', 'line', 'fengexian'],
        icon: Minus,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        },
      },
      {
        title: '表格',
        description: '插入一个 3x3 表格',
        searchTerms: ['table', 'biaoge'],
        icon: Table,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        },
      },
    ].filter((item) => {
      if (typeof query === 'string' && query.length > 0) {
        const search = query.toLowerCase()
        return (
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          (item.searchTerms && item.searchTerms.some((term: string) => term.includes(search)))
        )
      }
      return true
    })
  },

  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
