import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import { z } from "zod"

// 验证 Schema
const updateCollaboratorSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
})

const removeCollaboratorSchema = z.object({
  userId: z.string(),
})

type RouteProps = {
    params: Promise<{ noteId: string }>
}

// 获取协作者列表
export async function GET(req: NextRequest, props: RouteProps) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session) throw new AppError("Unauthorized", 401)

    const note = await prisma.note.findUnique({
      where: { id: params.noteId },
      include: {
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    if (!note) throw new AppError("Note not found", 404)

    // 权限检查：必须是 Owner 或 现有协作者
    const isOwner = note.userId === session.user.id
    const isCollaborator = note.collaborators.some(c => c.userId === session.user.id)

    if (!isOwner && !isCollaborator) {
      throw new AppError("Forbidden", 403)
    }

    // 构造返回数据
    // 将 Owner 也作为一个特殊的 "协作者" 返回，方便前端统一展示
    const ownerUser = await prisma.user.findUnique({
        where: { id: note.userId },
        select: { id: true, name: true, email: true, image: true }
    })

    const result = [
        {
            id: "owner", // 虚拟 ID
            userId: ownerUser?.id,
            role: "OWNER",
            user: ownerUser,
            createdAt: note.createdAt
        },
        ...note.collaborators
    ]

    return apiSuccess(result)
  } catch (error) {
    return handleApiError(error)
  }
}

// 更新协作者权限
export async function PUT(req: NextRequest, props: RouteProps) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session) throw new AppError("Unauthorized", 401)

    const json = await req.json()
    const { userId, role } = updateCollaboratorSchema.parse(json)

    // 1. 检查当前用户权限 (必须是 Owner 或 Admin)
    const note = await prisma.note.findUnique({
      where: { id: params.noteId },
      include: {
        collaborators: true,
      },
    })

    if (!note) throw new AppError("Note not found", 404)

    const isOwner = note.userId === session.user.id
    const currentCollaborator = note.collaborators.find(c => c.userId === session.user.id)
    const isAdmin = currentCollaborator?.role === "ADMIN"

    if (!isOwner && !isAdmin) {
      throw new AppError("Forbidden: Insufficient permissions", 403)
    }

    // 2. 检查目标用户是否存在于协作者列表中
    const targetCollaborator = note.collaborators.find(c => c.userId === userId)
    if (!targetCollaborator) {
        throw new AppError("Collaborator not found", 404)
    }

    // 3. 权限边界检查
    // Admin 不能修改 Owner (Owner 不在 collaborators 表里，所以不用担心)
    // Admin 不能修改其他 Admin 的权限? (通常 Admin 可以互改，或者只有 Owner 能改 Admin)
    // 这里简化逻辑：Owner 可以改任何人，Admin 可以改除了 Owner 以外的人
    // 但如果目标是 Admin，当前用户必须是 Owner 才能降级它？
    // 让我们简单点：Admin 可以修改任何非 Owner 的人。
    
    // 更新
    const updated = await prisma.noteCollaborator.update({
      where: {
        noteId_userId: {
          noteId: params.noteId,
          userId: userId,
        },
      },
      data: { role },
    })

    return apiSuccess(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

// 移除协作者
export async function DELETE(req: NextRequest, props: RouteProps) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session) throw new AppError("Unauthorized", 401)

    const json = await req.json()
    const { userId } = removeCollaboratorSchema.parse(json)

    // 1. 检查当前用户权限
    const note = await prisma.note.findUnique({
      where: { id: params.noteId },
      include: {
        collaborators: true,
      },
    })

    if (!note) throw new AppError("Note not found", 404)

    const isOwner = note.userId === session.user.id
    const currentCollaborator = note.collaborators.find(c => c.userId === session.user.id)
    const isAdmin = currentCollaborator?.role === "ADMIN"

    // 允许用户自己退出协作 (Leave)
    const isSelf = userId === session.user.id

    if (!isOwner && !isAdmin && !isSelf) {
      throw new AppError("Forbidden: Insufficient permissions", 403)
    }

    // 2. 执行删除
    await prisma.noteCollaborator.delete({
      where: {
        noteId_userId: {
          noteId: params.noteId,
          userId: userId,
        },
      },
    })

    return apiSuccess({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
