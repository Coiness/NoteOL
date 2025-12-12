import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { noteUpdateSchema } from "@/lib/validations/note"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

// In-memory request dedupe map to avoid duplicated operations from the same client
const recentRequestIds: Map<string, number> = new Map()
const DEDUPE_WINDOW_MS = 10 * 1000 // 10 seconds

async function verifyNoteOwnership(noteId: string, userId: string) {
    const note = await prisma.note.findUnique({
        where: { id: noteId },
    })
    if (!note) return null
    if (note.userId !== userId) return null
    return note
}

type RouteProps = {
    params: Promise<{ noteId: string }>
}

export async function GET(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) throw new AppError("Unauthorized", 401)
        
        const note = await prisma.note.findUnique({
            where: { id: params.noteId },
            include: {
                tags: true,
                noteRepositories: {
                    include: {
                        repository: true
                    }
                },
                collaborators: {
                    where: { userId: session.user.id }
                }
            }
        })

        if (!note) throw new AppError("Note not found", 404)

        // 权限检查：Owner 或 Collaborator
        const isOwner = note.userId === session.user.id
        const collaborator = note.collaborators[0] // 因为加了 where userId，所以最多只有一条
        const isCollaborator = !!collaborator

        if (!isOwner && !isCollaborator) {
            throw new AppError("Forbidden", 403)
        }

        // 确定当前用户的角色
        let role = "VIEWER"
        if (isOwner) {
            role = "OWNER"
        } else if (collaborator) {
            role = collaborator.role
        }

        // 返回数据中带上 role
        return apiSuccess({
            ...note,
            role,
            // 为了安全，不要把 collaborators 数组直接暴露给前端，除非需要显示协作者列表
            collaborators: undefined 
        })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PUT(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) throw new AppError("Unauthorized", 401)

        const requestId = req.headers.get('x-request-id') || 'unknown'

        // Simple dedupe: if a recent request with same id was processed, skip
        if (requestId !== 'unknown') {
            const last = recentRequestIds.get(requestId)
            if (last && Date.now() - last < DEDUPE_WINDOW_MS) {

                const current = await prisma.note.findUnique({
                    where: { id: params.noteId },
                    include: { tags: true }
                })
                return apiSuccess(current)
            }
            recentRequestIds.set(requestId, Date.now())
            // cleanup old entries every time we set one
            if (recentRequestIds.size > 2000) {
                const cutoff = Date.now() - DEDUPE_WINDOW_MS
                for (const [id, ts] of recentRequestIds) {
                    if (ts < cutoff) recentRequestIds.delete(id)
                }
            }
        }
        const json = await req.json()
        const body = noteUpdateSchema.parse(json)
        
        // 检查权限：Owner 或 Editor
        const note = await prisma.note.findUnique({
            where: { id: params.noteId },
            include: {
                collaborators: {
                    where: { userId: session.user.id }
                }
            }
        })

        if (!note) throw new AppError("Note not found", 404)

        const isOwner = note.userId === session.user.id
        const collaborator = note.collaborators[0]
        const canEdit = isOwner || (collaborator && ["EDITOR", "ADMIN"].includes(collaborator.role))

        if (!canEdit) {
             throw new AppError("Forbidden: Read-only access", 403)
        }

        const updatedNote = await prisma.$transaction(async (tx) => {
            const data: any = {
                updatedAt: new Date()
            }
            if (body.title !== undefined) data.title = body.title
            if (body.content !== undefined) {
                data.content = body.content
                // 简单的字数统计：去除 HTML 标签后计算长度
                const textContent = body.content.replace(/<[^>]*>/g, '') || ''
                data.wordCount = textContent.length
            }

            if (body.tags) {
                // 去重并过滤空标签
                const uniqueTags = Array.from(new Set(body.tags.filter(t => t.trim() !== "")))
                if (uniqueTags.length > 0) {
                    // 1) 找出已存在的 tags
                    const existing = await tx.tag.findMany({
                        where: {
                            userId: session.user.id,
                            name: { in: uniqueTags }
                        },
                        select: { id: true, name: true }
                    })

                    const existingNames = new Set(existing.map(t => t.name))
                    const toCreate = uniqueTags.filter(n => !existingNames.has(n))

                    // 2) 批量创建缺失的 tags
                    if (toCreate.length > 0) {
                        // createMany 支持 skipDuplicates
                        await tx.tag.createMany({
                            data: toCreate.map(name => ({ name, userId: session.user.id })),
                            skipDuplicates: true
                        })
                        // 查询一次拿到所有 tag ids
                    }

                    const allTags = await tx.tag.findMany({
                        where: {
                            userId: session.user.id,
                            name: { in: uniqueTags }
                        },
                        select: { id: true }
                    })

                    const tagConnects = allTags.map(t => ({ id: t.id }))
                    data.tags = { set: tagConnects }
                } else {
                    // 如果 tags 变为空，清空关联
                    data.tags = { set: [] }
                }
            }

            return await tx.note.update({
                where: { id: params.noteId },
                data,
                include: { tags: true }
            })
        }, {
            maxWait: 5000, // default: 2000
            timeout: 10000, // default: 5000
        })

        return apiSuccess(updatedNote)
    } catch (error) {
        console.error("[NOTE_UPDATE_ERROR]", error)
        return handleApiError(error)
    }
}

export async function DELETE(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) throw new AppError("Unauthorized", 401)

        const existingNote = await verifyNoteOwnership(params.noteId, session.user.id)
        if (!existingNote) throw new AppError("Note not found or access denied", 404)

        await prisma.note.delete({
            where: { id: params.noteId }
        })

        return apiSuccess({ message: "Note deleted" })
    } catch (error) {
        return handleApiError(error)
    }
}
