/**
 * 接受 Hocuspocus 的 Webhook 调用，保存 Note 内容到数据库
 * 验证API请求的合法性
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  // 1. 安全检查：只允许 Hocuspocus 调用
  const authHeader = req.headers.get("Authorization")
  const internalSecret = process.env.INTERNAL_SECRET || "internal-secret-key"
  
  if (authHeader !== `Bearer ${internalSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const body = await req.json()
    const { noteId, content, yjsState, title } = body

    if (!noteId || !yjsState) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // 2. 写入数据库
    // 计算字数 (简单估算)
    const wordCount = content ? content.replace(/<[^>]*>/g, '').length : 0

    // 构建更新数据
    const updateData: any = {
      content: content, // HTML
      yjsState: Buffer.from(yjsState, 'base64'), // 还原为 Bytes
      wordCount: wordCount,
      updatedAt: new Date(),
    }

    // 如果有标题，也更新标题
    if (title) {
      updateData.title = title
    }

    await prisma.note.update({
      where: { id: noteId },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Webhook] Failed to save note:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
