import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { noteCreateSchema } from "@/lib/validations/note"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new AppError("Unauthorized", 401)
    }

    const json = await req.json()
    const body = noteCreateSchema.parse(json)
    const userId = session.user.id

    let repositoryId = body.repositoryId

    // 如果没有提供 repositoryId，查找用户的默认知识库
    if (!repositoryId) {
      const defaultRepo = await prisma.repository.findFirst({
        where: {
          userId: userId,
          isDefault: true,
        },
      })
      
      if (!defaultRepo) {
        // 理论上注册时会创建，但为了健壮性，如果没有则创建一个
        const newDefaultRepo = await prisma.repository.create({
          data: {
            name: "默认知识库",
            userId: userId,
            isDefault: true,
          },
        })
        repositoryId = newDefaultRepo.id
      } else {
        repositoryId = defaultRepo.id
      }
    } else {
        // 验证 repository 是否属于该用户
        const repo = await prisma.repository.findUnique({
            where: { id: repositoryId }
        })
        if (!repo || repo.userId !== userId) {
             throw new AppError("Knowledge base not found or access denied", 404)
        }
    }

    // 开启事务处理笔记创建和关联
    const note = await prisma.$transaction(async (tx) => {
      // 1. 创建笔记
      const newNote = await tx.note.create({
        data: {
          title: body.title,
          content: body.content || "",
          userId: userId,
        },
      })

      // 2. 关联知识库
      await tx.noteRepository.create({
        data: {
          noteId: newNote.id,
          repositoryId: repositoryId!,
          userId: userId,
        },
      })

      // 3. 处理标签 (如果有)
      if (body.tags && body.tags.length > 0) {
        for (const tagName of body.tags) {
            const tag = await tx.tag.upsert({
                where: {
                    name_userId: {
                        name: tagName,
                        userId: userId
                    }
                },
                update: {},
                create: {
                    name: tagName,
                    userId: userId
                }
            })
            
            await tx.note.update({
                where: { id: newNote.id },
                data: {
                    tags: {
                        connect: { id: tag.id }
                    }
                }
            })
        }
      }
      
      return newNote
    })

    return apiSuccess(note)

  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new AppError("Unauthorized", 401)
    }
    const userId = session.user.id
    
    const { searchParams } = new URL(req.url)
    const repositoryId = searchParams.get("repositoryId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
        userId: userId
    }
    
    if (repositoryId) {
        where.noteRepositories = {
            some: {
                repositoryId: repositoryId
            }
        }
    }

    const [notes, total] = await prisma.$transaction([
        prisma.note.findMany({
            where,
            skip,
            take: limit,
            orderBy: { updatedAt: 'desc' },
            include: {
                tags: true,
                noteRepositories: {
                    include: {
                        repository: {
                            select: { id: true, name: true, color: true }
                        }
                    }
                }
            }
        }),
        prisma.note.count({ where })
    ])

    return apiSuccess({
        notes,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    })

  } catch (error) {
    return handleApiError(error)
  }
}
