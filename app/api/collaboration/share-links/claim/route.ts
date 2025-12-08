/**
 * 认领分享链接的逻辑
 * 1. 验证用户身份
 * 2. 查找并验证分享链接 Token
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const claimSchema = z.object({
  token: z.string(),
})

export async function POST(req: Request) {
  try {
    // 1. 检查登录状态
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = claimSchema.parse(json)

    // 2. 查找并验证 Token
    const shareLink = await prisma.shareLink.findUnique({
      where: { token: body.token },
    })

    // 不正确
    if (!shareLink) {
      return new NextResponse("Invalid token", { status: 404 })
    }

    // 超时
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return new NextResponse("Token expired", { status: 410 })
    }

    // 3. 检查是否已经是 Owner
    const note = await prisma.note.findUnique({
      where: { id: shareLink.noteId },
    })

    if (note?.userId === session.user.id) {
      // 已经是 Owner，直接返回成功
      return NextResponse.json({ noteId: shareLink.noteId })
    }

    // 4. 绑定关系 (Upsert: 如果已存在则更新角色，不存在则创建)
    await prisma.noteCollaborator.upsert({
      where: {
        noteId_userId: {
          noteId: shareLink.noteId,
          userId: session.user.id,
        },
      },
      update: {
        role: shareLink.role,
      },
      create: {
        noteId: shareLink.noteId,
        userId: session.user.id,
        role: shareLink.role,
      },
    })

    // 5. 将笔记加入用户的默认知识库 (确保用户在列表看到)
    let defaultRepo = await prisma.repository.findFirst({
      where: {
        userId: session.user.id,
        isDefault: true,
      },
    })
    console.log("5.将笔记加入用户默认知识库:", defaultRepo)

    // 如果没有默认知识库，创建一个
    if (!defaultRepo) {
        defaultRepo = await prisma.repository.create({
            data: {
                name: "默认知识库",
                userId: session.user.id,
                isDefault: true,
            }
        })
    }

    if (defaultRepo) {
      // 检查是否已经关联
      const existingRepoLink = await prisma.noteRepository.findUnique({
        where: {
          noteId_repositoryId: {
            noteId: shareLink.noteId,
            repositoryId: defaultRepo.id,
          },
        },
      })
      console.log("是否已经关联: ",existingRepoLink)

      if (!existingRepoLink) {
        await prisma.noteRepository.create({
          data: {
            noteId: shareLink.noteId,
            repositoryId: defaultRepo.id,
            userId: session.user.id,
          },
        })
      }
    }

    return NextResponse.json({ noteId: shareLink.noteId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    console.error("[SHARE_LINK_CLAIM]", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
