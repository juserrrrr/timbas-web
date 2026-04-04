import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { UserMenu } from "@/components/user-menu"
import { ServerSelector } from "@/components/server-selector"
import { ServerProvider } from "@/lib/server-context"
import { NavigationProvider } from "@/lib/navigation-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ServerProvider>
      <NavigationProvider>
      <div className="relative min-h-screen bg-[#050508] text-white">
        {/* Subtle background — same as landing */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff05_1px,_transparent_1px)] bg-[size:28px_28px]" />
          <div className="absolute -top-64 left-1/4 h-[600px] w-[600px] rounded-full bg-blue-800 opacity-[0.08] blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-red-800 opacity-[0.07] blur-[120px]" />
        </div>

        {/* Sidebar — desktop only */}
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        {/* Top bar */}
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-end gap-3 border-b border-white/[0.06] bg-[#050508]/80 px-6 backdrop-blur-xl md:left-16">
          <ServerSelector />
          <div className="h-6 w-px bg-white/[0.08]" />
          <UserMenu />
        </header>

        <main className="pt-14 min-h-screen pb-14 md:ml-16 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>

        {/* Bottom nav — mobile only */}
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      </div>
      </NavigationProvider>
    </ServerProvider>
  )
}
