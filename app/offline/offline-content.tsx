"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function OfflineContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [attemptedRoute, setAttemptedRoute] = useState('')
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    // 获取用户原本想访问的页面
    const from = searchParams.get('from') || '/'
    setAttemptedRoute(from)

    // 检查网络状态
    setIsOnline(navigator.onLine)

    // 监听网络状态变化
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [searchParams])

  const handleRetry = () => {
    if (navigator.onLine) {
      // 如果当前在线，刷新页面
      window.location.reload()
    } else {
      alert('仍然处于离线状态，请检查网络连接')
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleViewCached = () => {
    if (attemptedRoute) {
      router.push(attemptedRoute)
    }
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      padding: '50px 20px',
      background: '#f8f9fa',
      color: '#333',
      margin: 0,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#007bff', marginBottom: '20px', fontSize: '2rem' }}>
          📴 离线状态
        </h1>

        <p style={{ marginBottom: '20px', lineHeight: 1.6, fontSize: '1.1rem' }}>
          当前网络不可用，无法访问 <strong>{attemptedRoute}</strong>
        </p>

        <div style={{ margin: '30px 0' }}>
          <button
            onClick={handleRetry}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '10px',
              marginBottom: '10px'
            }}
          >
            重试连接
          </button>

          <button
            onClick={handleGoHome}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '10px',
              marginBottom: '10px'
            }}
          >
            返回首页
          </button>

          {attemptedRoute && (
            <button
              onClick={handleViewCached}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                marginBottom: '10px'
              }}
            >
              查看缓存内容
            </button>
          )}
        </div>

        <div style={{
          marginTop: '30px',
          textAlign: 'left',
          maxWidth: '400px',
          margin: '30px auto 0',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '5px'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>离线功能提示：</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
            <li>✅ 可以查看已缓存的知识库和笔记</li>
            <li>✅ 可以在本地创建新笔记（上线后同步）</li>
            <li>❌ 无法访问未缓存的内容</li>
            <li>❌ 无法与服务器同步数据</li>
          </ul>
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#6c757d' }}>
          网络状态: {isOnline ? '🟢 在线' : '🔴 离线'}
        </div>
      </div>
    </div>
  )
}