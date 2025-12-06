/**
 * 检查用户的Session，签发一个有效期为1分钟的JWT门票(Token)
 * 前端用这个Token连接协作编辑的WebSocket服务器
 */

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function GET() {
  // 1. 检查用户是否登录
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // 2. 签发门票 (Token)
  // 包含用户ID和名字，有效期设短一点（比如 1 分钟），因为连上 WS 后就不需要了
  const secret = process.env.COLLABORATION_SECRET || "super-secret-key"
  const token = jwt.sign(
    { 
      userId: session.user.id,
      name: session.user.name,
      image: session.user.image 
    }, 
    secret, 
    { expiresIn: "1m" } // 1分钟过期，足够前端连上 WS 了
  )

  return NextResponse.json({ token })
}
