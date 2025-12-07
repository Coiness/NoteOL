import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

type RouteProps = {
    params: Promise<{
        repoId: string
        noteId: string
    }>
}

// 删除知识库中的笔记关联
export async function DELETE(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) throw new AppError("Unauthorized", 401)

        const { repoId, noteId } = params

        // 1. 验证知识库归属
        const repo = await prisma.repository.findUnique({
            where: { id: repoId },
        })

        if (!repo) throw new AppError("Repository not found", 404)
        
        // 1. 验证用户是否有权限管理该知识库内容
        // 知识库是私有的，只有所有者可以移除笔记
        if (repo.userId !== session.user.id) {
            throw new AppError("Forbidden", 403)
        }

        // 2. 检查是否为默认知识库
        // 如果是，则不允许移除笔记
        // 默认知识库只能删除笔记，不能移除关联
        
        if (repo.isDefault) {
            throw new AppError("Cannot remove from Default Repository. Please delete the note instead.", 400)
        }

        // 3. 移除关联
        // 检查关联是否存在
        const link = await prisma.noteRepository.findUnique({
            where: {
                noteId_repositoryId: {
                    noteId: noteId,
                    repositoryId: repoId
                }
            }
        })

        if (!link) {
            throw new AppError("Note is not in this repository", 404)
        }

        await prisma.noteRepository.delete({
            where: {
                noteId_repositoryId: {
                    noteId: noteId,
                    repositoryId: repoId
                }
            }
        })

        return apiSuccess({ message: "Note removed from repository" })

    } catch (error) {
        return handleApiError(error)
    }
}
