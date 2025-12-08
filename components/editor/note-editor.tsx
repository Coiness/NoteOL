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
        class: "prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6",
      },
    },
    editable: !readOnly,
  })

  if (!editor) {
    return (
      <div className="flex h-[500px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <EditorToolbar editor={editor} />
      <div className="min-h-[500px]">
        <EditorContent editor={editor} />
      </div>
    </>
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
    <div className="relative w-full max-w-4xl mx-auto border rounded-lg shadow-sm bg-card">
      {/* 状态指示器 */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-2 py-1 text-xs rounded-full bg-background/80 backdrop-blur border shadow-sm">
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
