import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { UserMenu } from "@/components/user-menu"
import { ServerSelector } from "@/components/server-selector"
import { ServerProvider } from "@/lib/server-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ServerProvider>
      <div className="relative min-h-screen bg-[#050508] text-white">
        {/* Subtle background — same as landing */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff05_1px,_transparent_1px)] bg-[size:28px_28px]" />
          <div className="absolute -top-64 left-1/4 h-[600px] w-[600px] rounded-full bg-blue-800 opacity-[0.08] blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-red-800 opacity-[0.07] blur-[120px]" />
        </div>

        <DashboardSidebar />

        {/* Top bar */}
        <header className="fixed left-16 right-0 top-0 z-40 flex h-14 items-center justify-end gap-3 border-b border-white/[0.06] bg-[#050508]/80 px-6 backdrop-blur-xl">
          <ServerSelector />
          <div className="h-6 w-px bg-white/[0.08]" />
          <UserMenu />
        </header>

        <main className="ml-16 pt-14 min-h-screen">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </ServerProvider>
  )
}
