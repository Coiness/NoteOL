/**
 * 删除分享链接的逻辑
 * 1. 验证用户身份
 * 2. 获取分享链接信息
 * 3. 检查用户对笔记的权限（必须是 Owner）
 * 4. 删除分享链接记录
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 1. 获取 ShareLink 信息以检查权限
    const shareLink = await prisma.shareLink.findUnique({
      where: { id: params.id },
      include: { note: true },
    })

    if (!shareLink) {
      return new NextResponse("Share link not found", { status: 404 })
    }

    // 2. 检查权限：只有 Note 的 Owner 可以删除分享链接
    // (或者也可以允许创建者删除，这里简化为 Owner)
    if (shareLink.note.userId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // 3. 删除
    await prisma.shareLink.delete({
      where: { id: params.id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[SHARE_LINK_DELETE]", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
