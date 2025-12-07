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
import { IndexeddbPersistence } from "y-indexeddb"
import { useSession } from "next-auth/react"
import randomColor from "randomcolor"
import { useEffect, useState } from "react"
import { Loader2, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

import { Note } from "@/types"
import { cn } from "@/lib/utils"
import { EditorToolbar } from "./editor-toolbar"
import { TabKeymap } from "./extensions/tab-keymap"

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
}

export function NoteEditor({ note, readOnly = false }: NoteEditorProps) {
  const { data: session } = useSession()
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

  // 初始化 Y.js 文档
  // 使用 useState 确保 yDoc 在组件生命周期内保持稳定
  // 注意：由于 NoteDetail 已经给 NoteEditor 加了 key={noteId}，
  // 所以当 noteId 变化时，整个组件会重新挂载，yDoc 也会重新创建。
  const [yDoc] = useState(() => new Y.Doc())

  useEffect(() => {
    let wsProvider: HocuspocusProvider | null = null
    let indexeddbProvider: IndexeddbPersistence | null = null

    const init = async () => {
      // 1. 离线存储 (立即生效)
      // 使用 _v2 后缀强制重置本地缓存，避免旧数据导致的解码错误
      try {
        indexeddbProvider = new IndexeddbPersistence(note.id + '_v2', yDoc)

        indexeddbProvider.on('synced', () => {
          console.log('Content loaded from IndexedDB')
        })
      } catch (err) {
        // 捕获可能的 IndexedDB / Y.js 解码错误（例如 "Unexpected end of array"）
        // 这种错误通常表示本地存储的数据已损坏或与当前 Y.js 版本不兼容。
        console.error('[IndexedDB] failed to initialize IndexeddbPersistence', err)

        // 尝试删除 yjs IndexedDB 数据库，清理脏数据后再继续（这是有副作用的，会清空本地协同缓存）
        try {
          if (typeof indexedDB !== 'undefined') {
            // 数据库名由 y-indexeddb 使用，通常为 'yjs'
            const delReq = indexedDB.deleteDatabase('yjs')
            delReq.onsuccess = () => console.info('[IndexedDB] deleted yjs database')
            delReq.onerror = (e) => console.warn('[IndexedDB] delete database error', e)
            delReq.onblocked = () => console.warn('[IndexedDB] delete blocked')
          }
        } catch (e) {
          console.warn('[IndexedDB] failed to delete database', e)
        }

        // 继续，不使用 indexeddbProvider（应用仍能以在线/内存模式工作）
        indexeddbProvider = null
      }

      // 2. 获取 Token 并连接 WebSocket
      try {
        const res = await fetch('/api/collaboration/auth')
        if (!res.ok) throw new Error('Failed to get auth token')
        const { token } = await res.json()

        // 连接 WebSocket 服务
        wsProvider = new HocuspocusProvider({
          url: 'ws://localhost:1234',
          name: note.id,
          document: yDoc,
          token,
          onStatus: (data) => {
            setStatus(data.status)
          },
        })

        setProvider(wsProvider)
      } catch (error) {
        console.error('Failed to connect to collaboration server:', error)
        setStatus('disconnected')
        toast.error("连接协作服务失败，将仅在本地保存")
      }
    }

    init()

    return () => {
      if (wsProvider) wsProvider.destroy()
      if (indexeddbProvider) indexeddbProvider.destroy()
    }
  }, [note.id, yDoc])

  // 组件卸载时销毁 yDoc
  useEffect(() => {
    return () => {
      yDoc.destroy()
    }
  }, [yDoc])

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
