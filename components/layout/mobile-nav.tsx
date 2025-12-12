"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Menu } from "lucide-react"
import { Repository } from "@/types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function MobileNav() {
  const [open, setOpen] = React.useState(false)
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <SheetHeader>
            <SheetTitle className="text-left font-bold">NoteOL</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col space-y-4 py-4 pl-2">
            <MobileLink href="/repositories" onOpenChange={setOpen} pathname={pathname}>
                我的知识库
            </MobileLink>
            {defaultRepo && (
                <MobileLink href={`/repositories/${defaultRepo.id}`} onOpenChange={setOpen} pathname={pathname}>
                    默认知识库
                </MobileLink>
            )}
            <MobileLink href="/settings" onOpenChange={setOpen} pathname={pathname}>
                个人中心
            </MobileLink>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface MobileLinkProps extends React.PropsWithChildren {
  href: string
  onOpenChange?: (open: boolean) => void
  className?: string
  pathname: string
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  pathname,
  ...props
}: MobileLinkProps) {
  const isActive = pathname === href || (href !== "/repositories" && pathname.startsWith(href) && href !== "/");
  
  return (
    <Link
      href={href}
      onClick={() => {
        onOpenChange?.(false)
      }}
      className={cn(
        "text-base transition-colors hover:text-foreground",
        isActive ? "text-foreground font-medium" : "text-foreground/60",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}
