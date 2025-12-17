"use client"

import { Suspense, useEffect, useState } from 'react'
import { OfflineNoteDetail } from "@/components/editor/offline-note-detail"

interface OfflineNotePageProps {
  params: Promise<{ repoId: string; noteId: string }>
}

export default function OfflineNotePage({ params }: OfflineNotePageProps) {
  const [noteId, setNoteId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setNoteId(p.noteId))
  }, [params])

  if (!noteId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载离线笔记...</p>
        </div>
      </div>
    }>
      <div className="h-[calc(100vh-4rem)]">
        <OfflineNoteDetail noteId={noteId} />
      </div>
    </Suspense>
  )
}