
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  // 1. 安全检查：只允许 Hocuspocus 调用
  const authHeader = req.headers.get("Authorization")
  const internalSecret = process.env.INTERNAL_SECRET || "internal-secret-key"
  
  if (authHeader !== `Bearer ${internalSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const noteId = searchParams.get("noteId")

  if (!noteId) {
    return new NextResponse("Missing noteId", { status: 400 })
  }

  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { yjsState: true }
    })

    if (!note || !note.yjsState) {
      // 笔记不存在或没有 Y.js 状态，返回 404
      return new NextResponse("Note state not found", { status: 404 })
    }

    // 将 Bytes 转换为 Base64 字符串返回
    const yjsStateBase64 = Buffer.from(note.yjsState).toString('base64')

    return NextResponse.json({
      yjsState: yjsStateBase64
    })
  } catch (error) {
    console.error("[Webhook] Failed to get note state:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
