import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {  noteUpsertSchema } from "@/lib/validations/note"
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
        
        // 使用专门定义的 Upsert Schema 进行校验
        const body = noteUpsertSchema.parse(json)
        
        // 尝试 Upsert (如果不存在则创建，如果存在则更新)
        // 注意：Prisma upsert 需要 where, create, update
        
        // 获取默认知识库 (为了 Create 逻辑)
        let defaultRepoId: string | undefined
        // 如果是 Upsert Create 场景，我们需要知道 userId
        const userId = session.user.id

        const updatedNote = await prisma.$transaction(async (tx) => {
            // 1. 处理 Tags (无论是 Create 还是 Update 都需要 Tag ID)
            let tagConnects: { id: string }[] = []
            
            if (body.tags && Array.isArray(body.tags)) {
                // 去重并过滤空标签
                const uniqueTags = Array.from(new Set(body.tags.filter((t: string) => t && t.trim() !== ""))) as string[]
                
                if (uniqueTags.length > 0) {
                    // 批量 upsert tags
                    // 为了简化，我们先查询存在的，再创建不存在的
                    const existing = await tx.tag.findMany({
                        where: { userId, name: { in: uniqueTags } },
                        select: { id: true, name: true }
                    })
                    const existingNames = new Set(existing.map(t => t.name))
                    const toCreate = uniqueTags.filter(n => !existingNames.has(n))
                    
                    if (toCreate.length > 0) {
                        await tx.tag.createMany({
                            data: toCreate.map(name => ({ name, userId })),
                            skipDuplicates: true
                        })
                    }
                    
                    const allTags = await tx.tag.findMany({
                        where: { userId, name: { in: uniqueTags } },
                        select: { id: true }
                    })
                    tagConnects = allTags.map(t => ({ id: t.id }))
                }
            }

            // 2. 准备 Update 数据
            const updateData: any = { updatedAt: new Date() }
            if (body.title !== undefined) updateData.title = body.title
            if (body.content !== undefined) {
                updateData.content = body.content
                const textContent = body.content.replace(/<[^>]*>/g, '') || ''
                updateData.wordCount = textContent.length
            }
            if (body.tags) {
                updateData.tags = { set: tagConnects }
            }

            // 3. 准备 Create 数据 (用于 Upsert)
            // 如果是 Create，我们需要确保关联到默认知识库
            // 只有当 note 不存在时才会执行这个逻辑
            const createData: any = {
                id: params.noteId, // 使用前端传来的 UUID
                title: body.title || 'Untitled',
                content: body.content || '',
                userId: userId,
                tags: { connect: tagConnects }
            }
            
            // 关联知识库逻辑 (Create Only)
            // 注意：Prisma Upsert 的 create 块里做复杂关联比较麻烦，
            // 这里我们采用 "先尝试 Update，失败则 Create" 的逻辑，或者直接 Upsert Note，然后再处理 Repo
            
            // 实际上，为了处理 Repo 关联，最稳妥的是：
            // 1. 尝试 findUnique
            // 2. 存在 -> check permission -> update
            // 3. 不存在 -> create note -> create repo relation
            
            const existing = await tx.note.findUnique({
                where: { id: params.noteId },
                include: { collaborators: { where: { userId } } }
            })
            
            if (existing) {
                // Update Logic
                const isOwner = existing.userId === userId
                const collaborator = existing.collaborators[0]
                const canEdit = isOwner || (collaborator && ["EDITOR", "ADMIN"].includes(collaborator.role))
                if (!canEdit) throw new AppError("Forbidden: Read-only access", 403)
                
                return await tx.note.update({
                    where: { id: params.noteId },
                    data: updateData,
                    include: { tags: true }
                })
            } else {
                // Create Logic
                // 必须是当前用户创建的 ID 才能被允许 (防止覆盖他人 ID? 其实 randomUUID 碰撞概率极低)
                // 这里的安全性假设是：只要 ID 不存在，就可以创建。
                
                // 获取默认知识库
                const defaultRepo = await tx.repository.findFirst({
                    where: { userId, isDefault: true }
                })
                let targetRepoId = defaultRepo?.id
                
                // 如果没有默认知识库，创建一个
                if (!targetRepoId) {
                   const newRepo = await tx.repository.create({
                       data: { name: "默认知识库", userId, isDefault: true }
                   })
                   targetRepoId = newRepo.id
                }
                
                // 创建笔记
                const newNote = await tx.note.create({
                    data: {
                        ...createData,
                        noteRepositories: {
                            create: {
                                repositoryId: targetRepoId,
                                userId
                            }
                        }
                    },
                    include: { tags: true }
                })
                return newNote
            }
        }, {
            maxWait: 5000,
            timeout: 10000,
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
