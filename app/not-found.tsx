/**
 * 全局404页面
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">404 - 页面未找到</h2>
        <p className="text-muted-foreground">
          抱歉，您查找的页面不存在或已被移动。
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          返回首页
        </Link>
      </Button>
    </div>
  )
}
