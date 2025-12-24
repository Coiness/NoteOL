"use client"

/**
 * NoteEditor: 核心编辑器组件
 * 
 * 集成了 Tiptap 编辑器和 Y.js 实时协作引擎。
 * 
 * 核心功能:
 * 1. 初始化 Tiptap 编辑器实例，配置各种扩展 (Markdown, TaskList, Table 等)
 * 2. 通过 HocuspocusProvider 连接协作服务 (WebSocket)
 * 3. 实现了离线优先 (Offline-First) 的数据加载策略 (通过 y-indexeddb)
 * 4. 处理编辑器的错误边界 (ErrorBoundary) 和加载状态
 */

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Highlight from "@tiptap/extension-highlight"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { useSession } from "next-auth/react"
import randomColor from "randomcolor"
import { Loader2, Wifi, WifiOff } from "lucide-react"
import { useMemo } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { useStore } from "@/store/useStore"

import { Note } from "@/types"
import { cn } from "@/lib/utils"
import { EditorToolbar } from "./editor-toolbar"
import { TabKeymap } from "./extensions/tab-keymap"
import { SaveShortcut } from "./extensions/save-shortcut"
import { SlashCommand } from "./extensions/slash-command"
import { suggestion } from "./extensions/suggestion"
import { TableOfContents } from "./table-of-contents"

const lowlight = createLowlight(common)

/**
 * 编辑器错误回退 UI
 * 
 * 当编辑器组件崩溃时显示的界面，提供重试按钮。
 * 区分了网络/协作连接错误和通用初始化错误。
 */
function EditorErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-red-500 mb-4">
          <WifiOff className="w-12 h-12 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">编辑器加载失败</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          {error.message.includes('Cannot read properties of undefined') 
            ? '协作服务连接异常，请稍后重试'
            : '编辑器初始化失败，请刷新页面重试'
          }
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  )
}

interface TiptapEditorProps {
  noteId: string
  /** Y.js 文档实例 (Source of Truth) */
  yDoc: Y.Doc
  /** 协作提供者 (可选，离线模式下可能为 null) */
  provider: HocuspocusProvider | null
  readOnly: boolean
  session: any
}

/**
 * Tiptap 编辑器核心逻辑封装
 */
function TiptapEditor({ noteId, yDoc, provider, readOnly, session }: TiptapEditorProps) {
  const { setActiveNoteId, updateNotePreview, setActiveNoteContent } = useStore()

  // 使用 useMemo 延迟初始化 extensions，确保 yDoc 和 provider 稳定
  const extensions = useMemo(() => [
    StarterKit.configure({
      // @ts-ignore
      history: false, // ⚠️ 必须禁用自带历史记录，交给 Y.js 的 UndoManager 处理
    }),
    Image,
    Link.configure({
      openOnClick: false,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Highlight,
    CodeBlockLowlight.configure({
      lowlight,
    }),
    TabKeymap,
    SaveShortcut,
    SlashCommand.configure({
      suggestion,
    }),
    // 协同扩展 - 只有在 yDoc 存在时才添加
    ...(yDoc ? [Collaboration.configure({ document: yDoc })] : []),
    // 光标扩展 - 只有在 provider 和 provider.awareness 都存在时才添加
    ...(provider && provider.awareness ? [
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: session?.user?.name || "Anonymous",
          color: randomColor({ luminosity: "dark" }),
        },
      }),
    ] : []),
  ], [yDoc, provider, session])  // 依赖项变化时重新计算

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    editorProps: {
      attributes: {
        class: "prose prose-stone dark:prose-invert mx-auto focus:outline-none min-h-full px-8 py-12 pb-[30vh]",
      },
      // 确保光标距离底部有一定距离时就开始滚动
      scrollThreshold: {
        top: 100,
        bottom: 200, // 距离底部 200px 时开始滚动
        left: 0,
        right: 0,
      },
      // 滚动时保留的边距
      scrollMargin: {
        top: 100,
        bottom: 200, // 滚动后保持底部有 200px 的空间
        left: 0,
        right: 0,
      },
    },
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const content = editor.getText()
      updateNotePreview(noteId, content)
      setActiveNoteContent(content)
    },
    onCreate: ({ editor }) => {
      // 初始化时设置当前笔记信息
      setActiveNoteId(noteId)
      const content = editor.getText()
      updateNotePreview(noteId, content)
      setActiveNoteContent(content)
    },
    onDestroy: () => {
      setActiveNoteId(null)
      setActiveNoteContent(null)
    }
  })

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      {/* 左侧编辑器区域 */}
      <div 
        className="flex-1 h-full overflow-y-auto w-full cursor-text"
        onClick={() => {
          if (!editor.isFocused) {
            editor.chain().focus().run()
          }
        }}
      >
        <div className="max-w-4xl mx-auto h-full">
            <EditorContent editor={editor} className="h-full" />
        </div>
      </div>

      {/* 右侧大纲区域 - 固定宽度 */}
      <div className="hidden xl:block w-64 h-full border-l bg-muted/10 p-4 overflow-y-auto shrink-0">
        <TableOfContents editor={editor} />
      </div>
    </div>
  )
}

interface NoteEditorProps {
  note: Note
  readOnly?: boolean
  yDoc: Y.Doc
  provider: HocuspocusProvider | null
  status: "connecting" | "connected" | "disconnected"
}

export function NoteEditor({ note, readOnly = false, yDoc, provider, status }: NoteEditorProps) {
  const { data: session } = useSession()

  if (!yDoc) return null

  const isOfflineNote = note?.id?.startsWith('local_')

  return (
    <div className="relative w-full h-full bg-background">
      {/* 状态指示器 */}
      <div className="absolute top-2 right-4 z-10 flex items-center gap-2 px-2 py-1 text-xs rounded-full bg-background/80 backdrop-blur border shadow-sm">
        {isOfflineNote ? (
          <>
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">离线笔记</span>
          </>
        ) : status === 'connected' ? (
          <>
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">已连接</span>
          </>
        ) : status === 'connecting' ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
            <span className="text-muted-foreground">连接中...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-red-500" />
            <span className="text-muted-foreground">离线模式</span>
          </>
        )}
      </div>

      {/* 
        使用 key 强制重新挂载编辑器组件
        当 provider 从 null 变为有值时，组件会销毁并重建
        这确保了 CollaborationCursor 扩展是在一个干净的环境中初始化的
      */}
      <ErrorBoundary FallbackComponent={EditorErrorFallback}>
        <TiptapEditor 
          key={provider ? 'online' : 'offline'}
          noteId={note.id}
          yDoc={yDoc}
          provider={provider}
          readOnly={readOnly}
          session={session}
        />
      </ErrorBoundary>
    </div>
  )
}
