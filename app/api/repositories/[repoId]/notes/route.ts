import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import { z } from "zod"

const addNoteToRepoSchema = z.object({
    noteId: z.string(),
})

type RouteProps = {
    params: Promise<{ repoId: string }>
}

// Add a note to a repository (Link)
export async function POST(req: NextRequest, props: RouteProps) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) throw new AppError("Unauthorized", 401)

        const { repoId } = params
        const json = await req.json()
        const body = addNoteToRepoSchema.parse(json)
        const { noteId } = body

        // 1. Check if Repository exists and user has access
        const repo = await prisma.repository.findUnique({
            where: { id: repoId },
        })

        if (!repo) throw new AppError("Repository not found", 404)
        
        // Only Owner can add notes to their repository
        if (repo.userId !== session.user.id) {
            throw new AppError("Forbidden", 403)
        }

        // 2. Check if Note exists and user has access (at least VIEWER)
        const note = await prisma.note.findUnique({
            where: { id: noteId },
            include: {
                collaborators: {
                    where: { userId: session.user.id }
                }
            }
        })

        if (!note) throw new AppError("Note not found", 404)

        const isOwner = note.userId === session.user.id
        const isCollaborator = note.collaborators.length > 0

        if (!isOwner && !isCollaborator) {
             throw new AppError("Forbidden: You don't have access to this note", 403)
        }

        // 3. Create the link (Idempotent)
        await prisma.noteRepository.upsert({
            where: {
                noteId_repositoryId: {
                    noteId: noteId,
                    repositoryId: repoId
                }
            },
            create: {
                noteId: noteId,
                repositoryId: repoId,
                userId: session.user.id
            },
            update: {}
        })

        return apiSuccess({ message: "Note added to repository" })

    } catch (error) {
        return handleApiError(error)
    }
}
