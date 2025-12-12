"use client"

import { Suspense } from 'react'
import { RepositoryContent } from './repository-content'

export const dynamic = 'force-dynamic'

export default function RepositoryPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    }>
      <RepositoryContent />
    </Suspense>
  )
}
