"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Trophy, History, Settings, BarChart3, Home, Users, ChevronRight, Swords } from "lucide-react"

const NAV = [
  { icon: Home,     label: "Início",        href: "/dashboard",          color: "text-blue-400",   glow: "bg-blue-500/10",   active: "border-blue-500/20" },
  { icon: Trophy,   label: "Ranking",       href: "/dashboard/ranking",  color: "text-yellow-400", glow: "bg-yellow-500/10", active: "border-yellow-500/20" },
  { icon: History,  label: "Histórico",     href: "/dashboard/history",  color: "text-purple-400", glow: "bg-purple-500/10", active: "border-purple-500/20" },
  { icon: Users,    label: "Duplas",        href: "/dashboard/teams",    color: "text-green-400",  glow: "bg-green-500/10",  active: "border-green-500/20" },
  { icon: BarChart3,label: "Estatísticas",  href: "/dashboard/stats",    color: "text-red-400",    glow: "bg-red-500/10",    active: "border-red-500/20" },
  { icon: Swords,   label: "Comparação",    href: "/dashboard/versus",   color: "text-orange-400", glow: "bg-orange-500/10", active: "border-orange-500/20" },
]

const BOTTOM = [
  { icon: Settings, label: "Configurações", href: "/dashboard/settings", color: "text-gray-400",   glow: "bg-white/5",       active: "border-white/10" },
]

export function DashboardSidebar() {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()

  const NavItem = ({ item }: { item: typeof NAV[0] }) => {
    const isActive = pathname === item.href
    return (
      <Link
        href={item.href}
        className={`group relative flex items-center rounded-xl transition-colors duration-200 ${expanded ? "w-full px-3 py-2.5 gap-3" : "w-10 h-10 justify-center mx-auto"} ${
          isActive
            ? `border ${item.active} ${item.glow} ${item.color}`
            : "border border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        {/* Icon — position never changes */}
        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />

        {/* Label — always in DOM, only width+opacity transitions */}
        <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
          expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
        }`}>
          {item.label}
        </span>

        {/* Tooltip when collapsed */}
        {!expanded && (
          <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-lg border border-white/[0.08] bg-[#0d0d12] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block whitespace-nowrap">
            {item.label}
          </div>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {expanded && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setExpanded(false)} />
      )}

      <aside className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-[#07070c] transition-all duration-300 ${expanded ? "w-[220px]" : "w-16"}`}>

        {/* Logo */}
        <div className="flex h-14 items-center border-b border-white/[0.06] px-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 flex-shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
              <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={32} height={32} className="object-cover" />
            </div>
            <span className={`text-sm font-black tracking-tight text-white whitespace-nowrap transition-all duration-300 ${
              expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
            }`}>
              Timbas<span className="text-blue-400">Bot</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {NAV.map((item) => <NavItem key={item.href} item={item} />)}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] p-2 space-y-0.5">
          {BOTTOM.map((item) => <NavItem key={item.href} item={item} />)}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          >
            <ChevronRight className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            <span className={`text-xs font-medium whitespace-nowrap transition-all duration-300 ${
              expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
            }`}>
              Recolher
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
