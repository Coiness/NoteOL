"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Note } from "@/types"
import { FileText, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface ImportNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repositoryId: string
  existingNoteIds: string[]
}

export function ImportNoteDialog({ 
  open, 
  onOpenChange, 
  repositoryId, 
  existingNoteIds 
}: ImportNoteDialogProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch all notes (not filtered by repo)
  const { data: allNotes, isLoading } = useQuery<Note[]>({
    queryKey: ["notes", "all"], // Use a different key to avoid conflict with repo notes
    queryFn: async () => {
      const res = await fetch("/api/notes")
      if (!res.ok) throw new Error("Failed to fetch notes")
      const data = await res.json()
      return data.data.notes
    },
    enabled: open, // Only fetch when dialog is open
  })

  // Filter out notes that are already in the current repository
  const availableNotes = allNotes?.filter(note => !existingNoteIds.includes(note.id)) || []

  const importMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/repositories/${repositoryId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to import note")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("笔记已导入")
      queryClient.invalidateQueries({ queryKey: ["notes", repositoryId] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="px-4 pb-2 pt-4 border-b">
        <DialogTitle className="text-sm text-muted-foreground">导入现有笔记到知识库</DialogTitle>
      </DialogHeader>
      <CommandInput 
        placeholder="搜索笔记标题..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
            {isLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    加载中...
                </div>
            ) : (
                "没有找到可导入的笔记"
            )}
        </CommandEmpty>
        <CommandGroup heading="可导入笔记">
          {availableNotes.map((note) => (
            <CommandItem
              key={note.id}
              value={note.title}
              onSelect={() => importMutation.mutate(note.id)}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">{note.title}</span>
                    <span className="text-xs text-muted-foreground truncate">
                        {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: zhCN })}
                    </span>
                </div>
              </div>
              {importMutation.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
