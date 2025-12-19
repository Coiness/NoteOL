"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Repository } from "@/types"
import { useStore } from "@/store/useStore"
import { useEffect } from "react"

import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function MainNav({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenu>) {
  const pathname = usePathname()

  const { data: repositories } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories")
      if (!res.ok) throw new Error("Failed to fetch repositories")
      const data = await res.json()
      return data.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const defaultRepo = repositories?.find(r => r.isDefault)
  const setDefaultRepositoryId = useStore(state => state.setDefaultRepositoryId)

  useEffect(() => {
    if (defaultRepo) {
      setDefaultRepositoryId(defaultRepo.id)
      console.log("设置默认知识库")
    }
  }, [defaultRepo, setDefaultRepositoryId])

  return (
    <NavigationMenu className={className} {...props}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/repositories"
              className={cn(
                navigationMenuTriggerStyle(),
                "bg-transparent",
                pathname === "/repositories" && "bg-accent text-accent-foreground"
              )}
            >
              我的知识库
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        
        {defaultRepo && (
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                href={`/repositories/${defaultRepo.id}`}
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent",
                  pathname === `/repositories/${defaultRepo.id}` && "bg-accent text-accent-foreground"
                )}
              >
                默认知识库
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/settings"
              className={cn(
                navigationMenuTriggerStyle(),
                "bg-transparent",
                pathname.startsWith("/settings") && "bg-accent text-accent-foreground"
              )}
            >
              个人中心
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
