"use client"

import Link from "next/link"
import { BarChart3, History, Swords, Users } from "lucide-react"
import { usePathname } from "next/navigation"
import { normalizeDashboardPathname } from "@/lib/navigation"
import { NavigationLinkSignal } from "@/lib/navigation-context"

const SECTIONS = {
  matches: [
    { label: "Em andamento", href: "/matches", icon: Swords },
    { label: "Histórico", href: "/history", icon: History },
    { label: "Estatísticas", href: "/stats", icon: BarChart3 },
  ],
  stats: [
    { label: "Visão geral", href: "/stats", icon: BarChart3 },
    { label: "Duplas", href: "/teams", icon: Users },
    { label: "Comparação", href: "/versus", icon: Swords },
  ],
} as const

export function CustomMatchSubnav({ section }: { section: keyof typeof SECTIONS }) {
  const pathname = normalizeDashboardPathname(usePathname())

  return (
    <nav aria-label={section === "matches" ? "Seções das partidas" : "Seções das estatísticas"} className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/20 p-1.5 shadow-inner shadow-black/30 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SECTIONS[section].map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-9 flex-shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${active ? "bg-white/[0.09] text-white shadow-lg shadow-black/20 ring-1 ring-inset ring-white/[0.07]" : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"}`}
          >
            <NavigationLinkSignal />
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
