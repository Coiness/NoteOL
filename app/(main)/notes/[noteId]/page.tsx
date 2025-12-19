"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useStore } from "@/store/useStore"
import { Loader2 } from "lucide-react"
import { Repository } from "@/types"

interface PageProps {
  params: Promise<{ noteId: string }>
}

export default function NotePage(props: PageProps) {
  const params = use(props.params)
  const router = useRouter()
  const defaultRepositoryId = useStore(state => state.defaultRepositoryId)
  const setDefaultRepositoryId = useStore(state => state.setDefaultRepositoryId)

  // Fetch repositories if we don't have the default ID in store
  const { data: repositories } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories")
      if (!res.ok) throw new Error("Failed to fetch repositories")
      const data = await res.json()
      return data.data
    },
    enabled: !defaultRepositoryId,
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    let targetId = defaultRepositoryId

    if (!targetId && repositories) {
      const defaultRepo = repositories.find(r => r.isDefault)
      if (defaultRepo) {
        targetId = defaultRepo.id
        setDefaultRepositoryId(defaultRepo.id)
      } else if (repositories.length > 0) {
        targetId = repositories[0].id
      }
    }

    if (targetId) {
      router.replace(`/repositories/${targetId}?noteId=${params.noteId}`)
    }
  }, [defaultRepositoryId, repositories, params.noteId, router, setDefaultRepositoryId])

  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-sm">正在跳转到默认知识库...</p>
    </div>
  )
}
