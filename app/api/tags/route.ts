import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new AppError("Unauthorized", 401)
    }
    const userId = session.user.id

    const tags = await prisma.tag.findMany({
      where: { userId: userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
            select: { notes: true }
        }
      }
    })

    return apiSuccess(tags)
  } catch (error) {
    return handleApiError(error)
  }
}
