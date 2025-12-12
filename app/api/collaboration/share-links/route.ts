/**
 * 生成分享链接的逻辑
 * 1. 验证用户身份
 * 2. 检查用户对笔记的权限（Owner 或 Editor）
 * 3. 生成唯一的 Token
 * 4. 创建 ShareLink 记录
 * 5. 返回分享链接信息
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { randomBytes } from "crypto"

// 创建分享链接 Schema
const createShareLinkSchema = z.object({
  noteId: z.string(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = createShareLinkSchema.parse(json)

    // 1. 检查权限：只有 Owner 或 Admin 可以创建分享链接
    const note = await prisma.note.findUnique({
      where: { id: body.noteId },
      include: { collaborators: true },
    })

    if (!note) {
      return new NextResponse("Note not found", { status: 404 })
    }

    const isOwner = note.userId === session.user.id
    const isAdmin = note.collaborators.some(
      (c) => c.userId === session.user.id && c.role === "ADMIN"
    )

    if (!isOwner && !isAdmin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // 2. 生成 Token
    // 使用 randomBytes 生成安全的随机字符串
    const token = randomBytes(32).toString("hex")

    // 3. 创建 ShareLink
    const shareLink = await prisma.shareLink.create({
      data: {
        noteId: body.noteId,
        role: body.role,
        token: token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
      },
    })

    return NextResponse.json({
      id: shareLink.id,
      token: shareLink.token,
      role: shareLink.role,
      url: `${process.env.NEXTAUTH_URL}/share/claim?token=${token}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    console.error("[SHARE_LINK_CREATE]", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
