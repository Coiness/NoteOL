import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { noteCreateSchema } from "@/lib/validations/note"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new AppError("Unauthorized", 401)
    }

    const { searchParams } = new URL(req.url)
    const repositoryId = searchParams.get("repositoryId")
    const excludeRepositoryId = searchParams.get("excludeRepositoryId")
    const query = searchParams.get("query")
    const tagId = searchParams.get("tagId")
    const sort = searchParams.get("sort") || "updatedAt"
    const order = (searchParams.get("order") || "desc") as Prisma.SortOrder
    
    // 分页参数
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: Prisma.NoteWhereInput = {
      AND: [
        // 权限控制：用户必须是 Owner 或 Collaborator
        {
          OR: [
            { userId: session.user.id },
            { collaborators: { some: { userId: session.user.id } } }
          ]
        }
      ]
    }

    const andConditions = where.AND as Prisma.NoteWhereInput[]

    // 搜索过滤
    if (query) {
      if (query.startsWith('#')) {
        const tagName = query.slice(1)
        if (tagName) {
          andConditions.push({
            tags: { some: { name: { contains: tagName, mode: 'insensitive' } } }
          })
        }
      } else {
        andConditions.push({
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } }
          ]
        })
      }
    }

    // 标签过滤
    if (tagId) {
      andConditions.push({
        tags: { some: { id: tagId } }
      })
    }

    // 知识库过滤
    if (repositoryId) {
      andConditions.push({
        noteRepositories: { some: { repositoryId: repositoryId } }
      })
    }

    // 排除知识库过滤 (用于导入功能)
    if (excludeRepositoryId) {
      andConditions.push({
        noteRepositories: { none: { repositoryId: excludeRepositoryId } }
      })
    }

    // 执行查询
    const [total, notes] = await Promise.all([
      prisma.note.count({ where }),
      prisma.note.findMany({
        where,
        include: {
          tags: true,
          user: true,
          collaborators: {
            where: { userId: session.user.id }
          },
          noteRepositories: {
            include: { repository: true }
          }
        },
        orderBy: {
          [sort]: order
        },
        skip,
        take: limit
      })
    ])

    // 处理返回数据，添加 role 字段
    const formattedNotes = notes.map(note => ({
      ...note,
      role: note.userId === session.user.id ? "OWNER" : note.collaborators[0]?.role || "VIEWER"
    }))

    return apiSuccess({ 
      notes: formattedNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}

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

    // 获取默认知识库ID（所有笔记都必须在默认知识库中）
    const defaultRepo = await prisma.repository.findFirst({
      where: {
        userId: userId,
        isDefault: true,
      },
    })
    const defaultRepositoryId = defaultRepo?.id

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
      const noteRepos = []

      // 总是关联到默认知识库（如果存在）
      if (defaultRepositoryId) {
        const defaultNoteRepo = await tx.noteRepository.create({
          data: {
            noteId: newNote.id,
            repositoryId: defaultRepositoryId,
            userId: userId,
          },
        })
        noteRepos.push(defaultNoteRepo)
      }

      // 如果指定了不同的知识库，也关联到该知识库
      if (repositoryId && repositoryId !== defaultRepositoryId) {
        const specifiedNoteRepo = await tx.noteRepository.create({
          data: {
            noteId: newNote.id,
            repositoryId: repositoryId,
            userId: userId,
          },
        })
        noteRepos.push(specifiedNoteRepo)
      }

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
