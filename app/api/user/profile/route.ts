import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import { z } from "zod"

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new AppError("Unauthorized", 401)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            notes: true,
            repositories: true,
            tags: true,
          }
        }
      }
    })

    if (!user) throw new AppError("User not found", 404)

    // 计算总字数
    const notes = await prisma.note.findMany({
      where: { userId: session.user.id },
      select: { wordCount: true }
    })
    
    const totalWordCount = notes.reduce((acc, note) => acc + (note.wordCount || 0), 0)

    return apiSuccess({
      ...user,
      stats: {
        noteCount: user._count.notes,
        repoCount: user._count.repositories,
        tagCount: user._count.tags,
        wordCount: totalWordCount
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new AppError("Unauthorized", 401)

    const json = await req.json()
    const body = profileUpdateSchema.parse(json)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: body.name },
      select: { id: true, name: true, email: true, image: true }
    })

    return apiSuccess(user)
  } catch (error) {
    return handleApiError(error)
  }
}
