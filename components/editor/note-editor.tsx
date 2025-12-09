"use client"

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

import { Note } from "@/types"
import { cn } from "@/lib/utils"
import { EditorToolbar } from "./editor-toolbar"
import { TabKeymap } from "./extensions/tab-keymap"
import { SaveShortcut } from "./extensions/save-shortcut"
import { SlashCommand } from "./extensions/slash-command"
import { suggestion } from "./extensions/suggestion"
import { TableOfContents } from "./table-of-contents"

const lowlight = createLowlight(common)

interface TiptapEditorProps {
  yDoc: Y.Doc
  provider: HocuspocusProvider | null
  readOnly: boolean
  session: any
}

function TiptapEditor({ yDoc, provider, readOnly, session }: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // @ts-ignore
        history: false, // ⚠️ 必须禁用自带历史记录，交给 Y.js
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
      // 协同扩展
      Collaboration.configure({
        document: yDoc,
      }),
      // 光标扩展
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider: provider,
              user: {
                name: session?.user?.name || "Anonymous",
                color: randomColor({ luminosity: "dark" }),
              },
            }),
          ]
        : []),
    ],
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

  return (
    <div className="relative w-full h-full bg-background">
      {/* 状态指示器 */}
      <div className="absolute top-2 right-4 z-10 flex items-center gap-2 px-2 py-1 text-xs rounded-full bg-background/80 backdrop-blur border shadow-sm">
        {status === 'connected' ? (
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
      <TiptapEditor 
        key={provider ? 'online' : 'offline'}
        yDoc={yDoc}
        provider={provider}
        readOnly={readOnly}
        session={session}
      />
    </div>
  )
}
