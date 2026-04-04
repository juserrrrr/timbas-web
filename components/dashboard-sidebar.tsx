"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Trophy, History, Settings, BarChart3, Home, Users, ChevronRight, Swords, Radio } from "lucide-react"

const NAV = [
  { icon: Home,     label: "Início",        href: "/dashboard",          color: "text-blue-400",    glow: "bg-blue-500/10",    active: "border-blue-500/20" },
  { icon: Radio,    label: "Ao Vivo",       href: "/dashboard/active",   color: "text-emerald-400", glow: "bg-emerald-500/10", active: "border-emerald-500/20" },
  { icon: Trophy,   label: "Ranking",       href: "/dashboard/ranking",  color: "text-yellow-400",  glow: "bg-yellow-500/10",  active: "border-yellow-500/20" },
  { icon: History,  label: "Histórico",     href: "/dashboard/history",  color: "text-purple-400",  glow: "bg-purple-500/10",  active: "border-purple-500/20" },
  { icon: Users,    label: "Duplas",        href: "/dashboard/teams",    color: "text-green-400",   glow: "bg-green-500/10",   active: "border-green-500/20" },
  { icon: BarChart3,label: "Estatísticas",  href: "/dashboard/stats",    color: "text-red-400",     glow: "bg-red-500/10",     active: "border-red-500/20" },
  { icon: Swords,   label: "Comparação",    href: "/dashboard/versus",   color: "text-orange-400",  glow: "bg-orange-500/10",  active: "border-orange-500/20" },
]

const BOTTOM = [
  { icon: Settings, label: "Configurações", href: "/dashboard/settings", color: "text-gray-400", glow: "bg-white/5", active: "border-white/10" },
]

export function DashboardSidebar() {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setExpanded(false)} />
      )}

      <aside className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-[#07070c] transition-[width] duration-300 ${expanded ? "w-[220px]" : "w-16"}`}>

        {/* Logo */}
        <div className={`flex h-14 flex-shrink-0 items-center border-b border-white/[0.06] ${expanded ? "px-4" : "justify-center"}`}>
          <Link href="/dashboard" prefetch={false} className="flex items-center gap-3">
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
              <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={32} height={32} className="object-cover" />
            </div>
            <span className={`overflow-hidden text-sm font-black tracking-tight text-white whitespace-nowrap transition-all duration-300 ${
              expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"
            }`}>
              Timbas<span className="text-blue-400">Bot</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 ${
                  isActive
                    ? `border ${item.active} ${item.glow} ${item.color}`
                    : "border border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span className={`overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
                }`}>
                  {item.label}
                </span>
                {!expanded && (
                  <div className="pointer-events-none absolute left-full ml-3 z-[60] flex items-center gap-2 opacity-0 translate-x-1 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <div className="rounded-lg border border-white/[0.08] bg-[#0d0d14]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-xl shadow-black/40 backdrop-blur-sm whitespace-nowrap ring-1 ring-inset ring-white/[0.04]">
                      {item.label}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0 border-t border-white/[0.06] p-2 space-y-0.5">
          {BOTTOM.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 ${
                  isActive
                    ? `border ${item.active} ${item.glow} ${item.color}`
                    : "border border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span className={`overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
                }`}>
                  {item.label}
                </span>
                {!expanded && (
                  <div className="pointer-events-none absolute left-full ml-3 z-[60] flex items-center gap-2 opacity-0 translate-x-1 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <div className="rounded-lg border border-white/[0.08] bg-[#0d0d14]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-xl shadow-black/40 backdrop-blur-sm whitespace-nowrap ring-1 ring-inset ring-white/[0.04]">
                      {item.label}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          >
            <ChevronRight className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            <span className={`overflow-hidden text-xs font-medium whitespace-nowrap transition-all duration-300 ${
              expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"
            }`}>
              Recolher
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
