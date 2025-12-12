import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { UserNav } from "@/components/layout/user-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { GlobalSearch } from "@/components/global-search"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b shrink-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <MobileNav />
          <div className="flex items-center gap-2 font-bold text-xl mr-4">
            NoteOL
          </div>
          <MainNav className="mx-6 hidden md:flex" />
          <div className="ml-auto flex items-center space-x-4">
            <GlobalSearch />
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-auto bg-background md:overflow-hidden">
        {children}
      </div>
    </div>
  )
}
