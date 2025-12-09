"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Search, FileText, Loader2, Calendar } from "lucide-react"
import { Note } from "@/types"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 300)
  const [data, setData] = React.useState<Note[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (debouncedQuery.length === 0) {
      setData([])
      return
    }

    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/notes?query=${encodeURIComponent(debouncedQuery)}`)
        const json = await res.json()
        if (json.success) {
            setData(json.data.notes)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [debouncedQuery])

  const handleSelect = (noteId: string) => {
    setOpen(false)
    router.push(`/notes/${noteId}`)
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">搜索笔记...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
            placeholder="输入关键词搜索..." 
            value={query}
            onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                "未找到结果"
            )}
          </CommandEmpty>
          {data.length > 0 && (
            <CommandGroup heading="笔记">
              {data.map((note) => (
                <CommandItem
                  key={note.id}
                  value={`${note.title} ${note.id}`}
                  onSelect={() => handleSelect(note.id)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{note.title}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
