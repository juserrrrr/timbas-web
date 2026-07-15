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
      <div className="relative min-h-screen overflow-x-clip bg-[#050508] text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff06_1px,_transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <div className="absolute left-[65px] top-14 h-[calc(100%-3.5rem)] w-px bg-gradient-to-b from-blue-500/15 via-transparent to-red-500/10" />
        </div>

        {/* Sidebar — desktop only */}
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        {/* Top bar */}
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-end gap-2 border-b border-white/[0.07] bg-[#07070c]/85 px-3 shadow-[0_10px_40px_-30px_rgba(59,130,246,0.45)] backdrop-blur-xl sm:gap-3 sm:px-6 md:left-[65px]">
          <ServerSelector />
          <div className="h-6 w-px bg-white/[0.08]" />
          <UserMenu />
        </header>

        <main className="min-h-screen pb-20 pt-14 md:ml-[65px] md:pb-0">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-8 xl:px-10">{children}</div>
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
