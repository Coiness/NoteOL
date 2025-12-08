import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { noteCreateSchema } from "@/lib/validations/note"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new AppError("Unauthorized", 401)
    }

    const { searchParams } = new URL(req.url)
    const repositoryId = searchParams.get("repositoryId")

    let notes

    if (repositoryId) {
      // 如果指定了 repositoryId，返回该知识库中的笔记
      // 首先验证用户对该知识库的访问权限
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        include: {
          noteRepositories: {
            include: {
              note: {
                include: {
                  tags: true,
                  user: true, // 包含笔记所有者信息
                  collaborators: {
                    where: { userId: session.user.id }
                  }
                }
              }
            }
          }
        }
      })

      if (!repo) {
        throw new AppError("Repository not found", 404)
      }

      // 检查用户是否有权访问该知识库（Owner 或 Collaborator）
      if (repo.userId !== session.user.id) {
        throw new AppError("Access denied", 403)
      }

      // 过滤笔记：用户必须是 Owner 或 Collaborator
      notes = repo.noteRepositories
        .map(nr => nr.note)
        .filter(note => {
          const isOwner = note.userId === session.user.id
          const isCollaborator = note.collaborators.length > 0
          return isOwner || isCollaborator
        })
        .map(note => ({
          ...note,
          role: note.userId === session.user.id ? "OWNER" : note.collaborators[0]?.role || "VIEWER"
        }))

    } else {
      // 如果没有指定 repositoryId，返回用户的所有笔记（Owner + Collaborator）
      // 1. 获取用户作为 Owner 的笔记
      const ownedNotes = await prisma.note.findMany({
        where: { userId: session.user.id },
        include: {
          tags: true,
          user: true,
          noteRepositories: {
            include: { repository: true }
          }
        }
      })

      // 2. 获取用户作为 Collaborator 的笔记
      const collaboratedNotes = await prisma.noteCollaborator.findMany({
        where: { userId: session.user.id },
        include: {
          note: {
            include: {
              tags: true,
              user: true,
              noteRepositories: {
                include: { repository: true }
              }
            }
          }
        }
      })

      // 3. 合并并去重
      const allNotes = [
        ...ownedNotes.map(note => ({ ...note, role: "OWNER" })),
        ...collaboratedNotes.map(nc => ({ ...nc.note, role: nc.role }))
      ]

      // 去重（以防万一）
      const noteMap = new Map()
      allNotes.forEach(note => {
        if (!noteMap.has(note.id)) {
          noteMap.set(note.id, note)
        }
      })
      notes = Array.from(noteMap.values())
    }

    return apiSuccess({ notes })

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
