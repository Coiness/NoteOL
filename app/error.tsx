"use client"

/**
 * 全局UI错误边界
 * Next.js 的 App Router 提供的机制。
 * 当页面渲染过程中发生未捕获的错误时，会展示友好的错误界面，而不是应用崩溃白屏
 */

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 这里可以接入错误监控服务，如 Sentry
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">出了一点问题</h2>
        <p className="text-muted-foreground">
          我们无法处理您的请求。请稍后再试。
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          返回首页
        </Button>
        <Button onClick={() => reset()}>
          重试
        </Button>
      </div>
    </div>
  )
}
