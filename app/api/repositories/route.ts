import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { repositorySchema } from "@/lib/validations/repository"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new AppError("Unauthorized", 401)

    const json = await req.json()
    const body = repositorySchema.parse(json)
    const userId = session.user.id

    const repo = await prisma.repository.create({
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
        userId: userId,
      },
    })

    return apiSuccess(repo)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new AppError("Unauthorized", 401)
    const userId = session.user.id

    const repos = await prisma.repository.findMany({
      where: { userId: userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ],
    })

    return apiSuccess(repos)
  } catch (error) {
    return handleApiError(error)
  }
}
