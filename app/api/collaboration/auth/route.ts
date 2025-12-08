/**
 * 检查用户的Session，签发一个有效期为1分钟的JWT门票(Token)
 * 前端用这个Token连接协作编辑的WebSocket服务器
 */

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse, NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  // 1. 检查用户是否登录
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // 2. 获取笔记ID
  const { searchParams } = new URL(req.url)
  const noteId = searchParams.get("noteId")
  if (!noteId) {
    return new NextResponse("noteId is required", { status: 400 })
  }

  // 3. 检查用户对笔记的权限
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      collaborators: {
        where: { userId: session.user.id }
      }
    }
  })

  if (!note) {
    return new NextResponse("Note not found", { status: 404 })
  }

  // 确定用户角色
  let role = "VIEWER"
  if (note.userId === session.user.id) {
    role = "OWNER"
  } else {
    const collaborator = note.collaborators[0]
    if (collaborator) {
      role = collaborator.role
    } else {
      return new NextResponse("Access denied", { status: 403 })
    }
  }

  // 4. 签发包含权限信息的Token
  const secret = process.env.COLLABORATION_SECRET || "super-secret-key"
  const token = jwt.sign(
    {
      userId: session.user.id,
      name: session.user.name,
      image: session.user.image,
      noteId: noteId,
      role: role // 添加权限信息
    },
    secret,
    { expiresIn: "1m" } // 1分钟过期
  )

  return NextResponse.json({ token, role })
}
