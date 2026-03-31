import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { UserMenu } from "@/components/user-menu"
import { ServerSelector } from "@/components/server-selector"
import { ServerProvider } from "@/lib/server-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ServerProvider>
    <div className="relative h-screen bg-black text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Blue neon blob - top left */}
        <div
          className="absolute top-0 left-0 h-[600px] w-[600px] opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 1) 0%, rgba(37, 99, 235, 0.6) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        {/* Red neon blob - bottom right */}
        <div
          className="absolute bottom-0 right-0 h-[600px] w-[600px] opacity-60"
          style={{
            background: "radial-gradient(circle, rgba(239, 68, 68, 1) 0%, rgba(220, 38, 38, 0.6) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        {/* Purple accent blob - center */}
        <div
          className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse, rgba(147, 51, 234, 0.8) 0%, rgba(126, 34, 206, 0.4) 50%, transparent 70%)",
            filter: "blur(80px)",
            transform: "translate(-50%, -50%) rotate(45deg)",
          }}
        />
      </div>

      <div className="relative z-10">
        <DashboardSidebar />

        <div className="fixed right-6 top-5 z-50 flex items-center gap-3">
          <ServerSelector />
          <UserMenu />
        </div>

        <main className="ml-20 h-screen overflow-y-auto custom-scrollbar">
          <div className="container mx-auto px-4 py-8">{children}</div>
        </main>
      </div>
    </div>
    </ServerProvider>
  )
}
