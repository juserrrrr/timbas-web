import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { NavigationProvider } from "@/lib/navigation-context"
import { DashboardContent, DashboardTopbar } from "@/components/dashboard-chrome"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <div className="modern-app-shell relative min-h-[100dvh] overflow-x-clip bg-zinc-950 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgb(255_255_255/0.035)_1px,_transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <div className="absolute left-[65px] top-14 h-[calc(100%-3.5rem)] w-px bg-gradient-to-b from-blue-500/15 via-transparent to-red-500/10" />
          <div className="app-ambient-orb absolute -left-64 top-[-22rem] h-[46rem] w-[46rem] rounded-full bg-blue-600/[0.08] blur-[150px]" />
          <div className="app-ambient-orb absolute -right-72 bottom-[-24rem] h-[48rem] w-[48rem] rounded-full bg-red-600/[0.065] blur-[160px] [animation-delay:-5s]" />
        </div>

        {/* Sidebar, desktop only */}
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        <DashboardTopbar />

        <main className="min-h-[100dvh] pb-24 pt-14 md:ml-[65px] md:pb-0">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-8 xl:px-10"><DashboardContent>{children}</DashboardContent></div>
        </main>

        {/* Bottom nav, mobile only */}
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      </div>
    </NavigationProvider>
  )
}
