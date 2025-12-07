"use client"

import { useEffect, useState, useRef } from "react"  // 新增 useRef
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ClaimPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [isClaiming, setIsClaiming] = useState(false)
  const isClaimingRef = useRef(false)  // 新增 ref 来跟踪状态

  const token = searchParams.get("token")

  useEffect(() => {
    // 1. 检查 Token 是否存在
    if (!token) {
      toast.error("无效的分享链接")
      router.push("/")
      return
    }

    // 2. 等待 Session 加载
    if (status === "loading") return

    // 3. 如果未登录，跳转到登录页
    if (status === "unauthenticated") {
      const callbackUrl = `/share/claim?token=${token}`
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      return
    }

    // 4. 已登录，执行 Claim
    const claimNote = async () => {
      if (isClaimingRef.current) return  // 用 ref 检查，避免依赖 state
      isClaimingRef.current = true
      setIsClaiming(true)

      try {
        const res = await fetch("/api/collaboration/share-links/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || "加入失败")
        }

        const data = await res.json()
        toast.success("成功加入笔记！")
        
        // 5. 跳转到笔记详情页
        router.push(`/notes/${data.noteId}`)
      } catch (error: any) {
        console.error("Claim error:", error)
        toast.error(error.message || "加入笔记失败，请重试")
        // 失败后跳转回首页或笔记列表
        router.push("/notes")
      } finally {
        isClaimingRef.current = false
        setIsClaiming(false)
      }
    }

    claimNote()
  }, [token, status, router])  // 移除 isClaiming 从依赖数组

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">正在加入笔记...</p>
    </div>
  )
}