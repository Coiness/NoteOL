"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/notes"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname.startsWith("/notes")
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        笔记
      </Link>
      <Link
        href="/repositories"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname.startsWith("/repositories")
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        知识库
      </Link>
    </nav>
  )
}
