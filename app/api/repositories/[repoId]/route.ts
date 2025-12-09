import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { repositorySchema } from "@/lib/validations/repository"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

type RouteProps = {
    params: Promise<{ repoId: string }>
}

export async function GET(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) throw new AppError("Unauthorized", 401)

        const repo = await prisma.repository.findUnique({
            where: { id: params.repoId }
        })

        if (!repo) {
            throw new AppError("Repository not found", 404)
        }

        // 简单的权限检查：目前只允许 Owner 查看详情
        // 如果未来支持协作知识库，这里需要修改
        if (repo.userId !== session.user.id) {
             throw new AppError("Access denied", 403)
        }

        return apiSuccess(repo)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PUT(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) throw new AppError("Unauthorized", 401)

        const json = await req.json()
        const body = repositorySchema.parse(json)
        
        const repo = await prisma.repository.findUnique({
            where: { id: params.repoId }
        })

        if (!repo || repo.userId !== session.user.id) {
            throw new AppError("Repository not found or access denied", 404)
        }

        const updatedRepo = await prisma.repository.update({
            where: { id: params.repoId },
            data: {
                name: body.name,
                description: body.description,
                color: body.color,
            }
        })

        return apiSuccess(updatedRepo)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) throw new AppError("Unauthorized", 401)

        const repo = await prisma.repository.findUnique({
            where: { id: params.repoId }
        })

        if (!repo || repo.userId !== session.user.id) {
            throw new AppError("Repository not found or access denied", 404)
        }

        if (repo.isDefault) {
            throw new AppError("Cannot delete default repository", 400)
        }

        await prisma.repository.delete({
            where: { id: params.repoId }
        })

        return apiSuccess({ message: "Repository deleted" })
    } catch (error) {
        return handleApiError(error)
    }
}
