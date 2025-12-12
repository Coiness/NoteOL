import { NoteDetail } from "@/components/editor/note-detail"

interface PageProps {
  params: Promise<{ noteId: string }>
}

export const dynamic = 'force-dynamic'

export default async function NotePage(props: PageProps) {
  const params = await props.params
  return (
    <div className="h-[calc(100vh-4rem)]">
      <NoteDetail noteId={params.noteId} key={params.noteId} />
    </div>
  )
}
