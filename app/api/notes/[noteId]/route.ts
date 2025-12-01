import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { noteUpdateSchema } from "@/lib/validations/note"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"

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
                }
            }
        })

        if (!note) throw new AppError("Note not found", 404)
        if (note.userId !== session.user.id) throw new AppError("Forbidden", 403)

        return apiSuccess(note)
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
        const body = noteUpdateSchema.parse(json)
        
        const existingNote = await verifyNoteOwnership(params.noteId, session.user.id)
        if (!existingNote) throw new AppError("Note not found or access denied", 404)

        const updatedNote = await prisma.$transaction(async (tx) => {
            const data: any = {
                updatedAt: new Date()
            }
            if (body.title !== undefined) data.title = body.title
            if (body.content !== undefined) data.content = body.content

            if (body.tags) {
                const tagConnects = []
                for (const tagName of body.tags) {
                     const tag = await tx.tag.upsert({
                        where: { name_userId: { name: tagName, userId: session.user.id } },
                        create: { name: tagName, userId: session.user.id },
                        update: {}
                    })
                    tagConnects.push({ id: tag.id })
                }
                data.tags = { set: tagConnects }
            }

            return await tx.note.update({
                where: { id: params.noteId },
                data,
                include: { tags: true }
            })
        })

        return apiSuccess(updatedNote)
    } catch (error) {
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
