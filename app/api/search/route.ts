import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import { stripHtml } from "@/lib/utils"
import { Note } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new AppError("Unauthorized", 401)
    }

    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get("query")

    if (!rawQuery) {
      return apiSuccess({ title: [], content: [], tags: [], repositories: [] })
    }

    // 解析查询类型
    let searchType: 'global' | 'title' | 'content' | 'tags' | 'repositories' = 'global'
    let query = rawQuery

    if (rawQuery.startsWith('#')) {
      searchType = 'tags'
      query = rawQuery.slice(1)
    } else if (rawQuery.startsWith('@')) {
      searchType = 'repositories'
      query = rawQuery.slice(1)
    } else if (rawQuery.startsWith('title:')) {
      searchType = 'title'
      query = rawQuery.slice(6)
    } else if (rawQuery.startsWith('content:')) {
      searchType = 'content'
      query = rawQuery.slice(8)
    }

    // 构建权限查询条件：用户是 Owner 或 Collaborator
    const userAccessFilter = {
      OR: [
        { userId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } }
      ]
    }

    // 根据搜索类型执行不同的查询
    let titleMatches: Note[] = []
    let tagMatches: Note[] = []
    let contentMatches: Note[] = []
    let repositoryMatches: Note[] = []

    if (searchType === 'global') {
      // 全局搜索：并行执行所有类型的查询
      const [title, tags, content] = await Promise.all([
        // 标题匹配
        prisma.note.findMany({
          where: {
            AND: [
              userAccessFilter,
              { title: { contains: query } }
            ]
          },
          take: 20,
          include: { tags: true },
          orderBy: { updatedAt: 'desc' }
        }),
        // 标签匹配
        prisma.note.findMany({
          where: {
            AND: [
              userAccessFilter,
              { tags: { some: { name: { contains: query } } } }
            ]
          },
          take: 20,
          include: { tags: true },
          orderBy: { updatedAt: 'desc' }
        }),
        // 内容匹配
        prisma.note.findMany({
          where: {
            AND: [
              userAccessFilter,
              { content: { contains: query } }
            ]
          },
          take: 20,
          include: { tags: true },
          orderBy: { updatedAt: 'desc' }
        })
      ])

      titleMatches = title
      tagMatches = tags
      contentMatches = content
    } else if (searchType === 'title') {
      // 仅标题搜索
      titleMatches = await prisma.note.findMany({
        where: {
          AND: [
            userAccessFilter,
            { title: { contains: query } }
          ]
        },
        take: 20,
        include: { tags: true },
        orderBy: { updatedAt: 'desc' }
      })
    } else if (searchType === 'content') {
      // 仅内容搜索
      contentMatches = await prisma.note.findMany({
        where: {
          AND: [
            userAccessFilter,
            { content: { contains: query } }
          ]
        },
        take: 20,
        include: { tags: true },
        orderBy: { updatedAt: 'desc' }
      })
    } else if (searchType === 'tags') {
      // 仅标签搜索
      tagMatches = await prisma.note.findMany({
        where: {
          AND: [
            userAccessFilter,
            { tags: { some: { name: { contains: query } } } }
          ]
        },
        take: 20,
        include: { tags: true },
        orderBy: { updatedAt: 'desc' }
      })
    } else if (searchType === 'repositories') {
      // 知识库搜索：查找指定知识库中的所有笔记
      repositoryMatches = await prisma.note.findMany({
        where: {
          AND: [
            userAccessFilter,
            {
              noteRepositories: {
                some: {
                  repository: {
                    name: { contains: query }
                  }
                }
              }
            }
          ]
        },
        take: 20,
        include: { tags: true, noteRepositories: { include: { repository: true } } },
        orderBy: { updatedAt: 'desc' }
      })
    }

    // 处理内容匹配的摘要
    const contentMatchesWithSnippet = contentMatches.map(note => {
        const plainText = stripHtml(note.content || "")
        // 简单的查找，忽略大小写
        const index = plainText.toLowerCase().indexOf(query.toLowerCase())
        
        let snippet = plainText.slice(0, 100) // 默认取前100个字符
        
        if (index !== -1) {
            // 截取关键词前后的一段文本
            const start = Math.max(0, index - 30)
            const end = Math.min(plainText.length, index + query.length + 70)
            snippet = (start > 0 ? "..." : "") + plainText.slice(start, end) + (end < plainText.length ? "..." : "")
        }
        
        return {
            ...note,
            content: snippet
        }
    })

    return apiSuccess({
      title: titleMatches,
      tags: tagMatches,
      content: contentMatchesWithSnippet,
      repositories: repositoryMatches
    })

  } catch (error) {
    return handleApiError(error)
  }
}
