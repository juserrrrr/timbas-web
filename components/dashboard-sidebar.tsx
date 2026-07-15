"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Trophy, History, Settings, BarChart3, Home, Users, ChevronRight, Swords, Radio, ShieldAlert, ShieldCheck, UserSearch } from "lucide-react"
import { useNavigation } from "@/lib/navigation-context"
import { BetaBadge } from "@/components/ui/beta-badge"

type NavItem = {
  icon: React.ElementType
  label: string
  href: string
  color: string
  glow: string
  active: string
  beta?: boolean
}

const NAV: NavItem[] = [
  { icon: Home,     label: "Início",        href: "/dashboard",          color: "text-blue-400",    glow: "bg-blue-500/10",    active: "ring-blue-500/20" },
  { icon: Radio,    label: "Ao Vivo",       href: "/dashboard/active",   color: "text-emerald-400", glow: "bg-emerald-500/10", active: "ring-emerald-500/20" },
  { icon: Trophy,   label: "Ranking",       href: "/dashboard/ranking",  color: "text-yellow-400",  glow: "bg-yellow-500/10",  active: "ring-yellow-500/20" },
  { icon: History,  label: "Histórico",     href: "/dashboard/history",  color: "text-purple-400",  glow: "bg-purple-500/10",  active: "ring-purple-500/20" },
  { icon: Users,    label: "Duplas",        href: "/dashboard/teams",    color: "text-green-400",   glow: "bg-green-500/10",   active: "ring-green-500/20" },
  { icon: BarChart3,label: "Estatísticas",  href: "/dashboard/stats",    color: "text-red-400",     glow: "bg-red-500/10",     active: "ring-red-500/20" },
  { icon: UserSearch,label: "Perfil LoL",    href: "/dashboard/lol-profile", color: "text-sky-400",  glow: "bg-sky-500/10",     active: "ring-sky-500/20", beta: true },
  { icon: Swords,      label: "Comparação",    href: "/dashboard/versus",   color: "text-orange-400",  glow: "bg-orange-500/10",  active: "ring-orange-500/20" },
  { icon: ShieldAlert, label: "Clash Scout",   href: "/dashboard/clash",    color: "text-amber-400",   glow: "bg-amber-500/10",   active: "ring-amber-500/20", beta: true },
  { icon: ShieldCheck, label: "Verificar LoL", href: "/dashboard/verify",   color: "text-emerald-400", glow: "bg-emerald-500/10", active: "ring-emerald-500/20", beta: true },
]

const BOTTOM: NavItem[] = [
  { icon: Settings, label: "Configurações", href: "/dashboard/settings", color: "text-gray-400", glow: "bg-white/5", active: "ring-white/10" },
]

function NavLink({ item, isActive, expanded }: { item: NavItem; isActive: boolean; expanded: boolean }) {
  const { navigate } = useNavigation()
  return (
    <Link
      href={item.href}
      onClick={(e) => { e.preventDefault(); if (!isActive) navigate(item.href) }}
      prefetch={false}
      className={`group relative flex w-full items-center rounded-xl ring-1 ring-inset transition-all duration-300 ${
        isActive
          ? `${item.active} ${item.glow} ${item.color}`
          : "ring-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {/* Icon — fixed size, never moves */}
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
        <item.icon className="h-[18px] w-[18px]" />
        {/* Beta dot when collapsed */}
        {item.beta && !expanded && (
          <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse" />
        )}
      </div>

      {/* Label — slides in, never collapses via display:none */}
      <span className={`flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-bold transition-all duration-300 ${
        expanded ? "max-w-[150px] opacity-100 pr-3" : "max-w-0 opacity-0"
      }`}>
        {item.label}
        {item.beta && <BetaBadge />}
      </span>

      {/* Tooltip when collapsed — springs out from the sidebar on hover */}
      {!expanded && (
        <div className="pointer-events-none absolute left-full ml-3 z-[60] origin-left scale-75 opacity-0 -translate-x-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-100 group-hover:opacity-100 group-hover:translate-x-0">
          <div className="relative flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0d0d14]/95 px-3 py-1.5 shadow-2xl shadow-black/40 backdrop-blur-md whitespace-nowrap ring-1 ring-inset ring-white/[0.04]">
            <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-white/[0.08] bg-[#0d0d14]" />
            <span className={`text-xs font-black uppercase tracking-wider ${item.color}`}>{item.label}</span>
            {item.beta && <BetaBadge />}
          </div>
        </div>
      )}
    </Link>
  )
}

export function DashboardSidebar() {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setExpanded(false)} />
      )}

      <aside className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-[#07070c] transition-[width] duration-300 ${expanded ? "w-[220px]" : "w-[65px]"}`}>

        {/* Logo */}
        <div className="flex h-14 flex-shrink-0 items-center overflow-hidden border-b border-white/[0.06]">
          <Link href="/dashboard" prefetch={false} className="flex items-center">
            <div className="flex h-14 w-[65px] flex-shrink-0 items-center justify-center">
              <div className="h-8 w-8 overflow-hidden rounded-lg ring-1 ring-white/10">
                <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={32} height={32} className="object-cover" />
              </div>
            </div>
            <span className={`overflow-hidden text-sm font-black tracking-tight text-white whitespace-nowrap transition-all duration-300 ${
              expanded ? "max-w-[140px] opacity-100 pr-4" : "max-w-0 opacity-0"
            }`}>
              Timbas<span className="text-blue-400">Bot</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 py-2 px-3">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} expanded={expanded} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0 space-y-0.5 border-t border-white/[0.06] py-2 px-3">
          {BOTTOM.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} expanded={expanded} />
          ))}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full cursor-pointer items-center overflow-hidden rounded-xl border border-transparent text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            </div>
            <span className={`overflow-hidden whitespace-nowrap text-xs font-medium transition-all duration-300 ${
              expanded ? "max-w-[140px] opacity-100 pr-3" : "max-w-0 opacity-0"
            }`}>
              Recolher
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
