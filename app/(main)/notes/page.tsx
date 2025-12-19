"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useStore } from "@/store/useStore"
import { Loader2 } from "lucide-react"
import { Repository } from "@/types"

function NotesRedirector() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const noteId = searchParams.get("noteId")
  const defaultRepositoryId = useStore(state => state.defaultRepositoryId)
  const setDefaultRepositoryId = useStore(state => state.setDefaultRepositoryId)

  // Fetch repositories if we don't have the default ID in store
  const { data: repositories, isLoading } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories")
      if (!res.ok) throw new Error("Failed to fetch repositories")
      const data = await res.json()
      return data.data
    },
    enabled: !defaultRepositoryId, // Only fetch if we don't have the ID
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    let targetId = defaultRepositoryId

    // If not in store, try to find in fetched data
    if (!targetId && repositories) {
      const defaultRepo = repositories.find(r => r.isDefault)
      if (defaultRepo) {
        targetId = defaultRepo.id
        setDefaultRepositoryId(defaultRepo.id)
      } else if (repositories.length > 0) {
        // Fallback to first repo if no default
        targetId = repositories[0].id
      }
    }

    if (targetId) {
      const url = noteId 
        ? `/repositories/${targetId}?noteId=${noteId}` 
        : `/repositories/${targetId}`
      router.replace(url)
    }
  }, [defaultRepositoryId, repositories, noteId, router, setDefaultRepositoryId])

  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-sm">正在跳转到默认知识库...</p>
    </div>
  )
}

export default function NotesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">加载中...</p>
      </div>
    }>
      <NotesRedirector />
    </Suspense>
  )
}
