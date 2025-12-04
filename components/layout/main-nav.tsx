"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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
                pathname.startsWith("/repositories") && "bg-accent text-accent-foreground"
              )}
            >
              我的知识库
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
