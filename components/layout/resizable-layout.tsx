"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "../../hooks/use-media-query"

interface ResizableLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
  defaultCollapsed?: boolean
}

export function ResizableLayout({ sidebar, children, defaultCollapsed = false }: ResizableLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // 当切换到移动端时，确保侧边栏不影响布局（虽然 hidden md:flex 已经处理了）
  // 当切换回桌面端时，保持之前的折叠状态

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
            "hidden md:flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out relative z-20",
            isCollapsed ? "w-0 border-r-0 overflow-hidden" : "w-80"
        )}
      >
        <div className="flex-1 overflow-hidden h-full w-80">
            {sidebar}
        </div>
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-80 flex flex-col">
            <SheetTitle className="sr-only">Sidebar</SheetTitle>
            <div className="flex-1 overflow-hidden">
                {sidebar}
            </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background transition-all duration-300">
        {/* Toggle Buttons Area */}
        <div className="absolute top-24 left-3 z-10 flex gap-2 pointer-events-none">
            {/* Mobile Toggle */}
            <div className="pointer-events-auto md:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 bg-background/50 backdrop-blur border shadow-sm"
                    onClick={() => setIsMobileOpen(true)}
                >
                    <Menu className="h-4 w-4" />
                </Button>
            </div>

            {/* Desktop Toggle Button (Always visible) */}
            <div className="pointer-events-auto hidden md:block">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 bg-background/50 backdrop-blur border shadow-sm"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
                >
                    {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
            </div>
        </div>

        {children}
      </main>
    </div>
  )
}
