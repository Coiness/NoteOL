"use client"

import { Suspense } from 'react'
import { OfflineContent } from './offline-content'

export default function OfflinePage() {
  return (
    <Suspense fallback={
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        textAlign: 'center',
        padding: '50px 20px',
        background: '#f8f9fa',
        color: '#333',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    }>
      <OfflineContent />
    </Suspense>
  )
}