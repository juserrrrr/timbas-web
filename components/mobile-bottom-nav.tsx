"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Trophy, History, Users, BarChart3, Swords, Settings, X, MoreHorizontal } from "lucide-react"

const LEFT_NAV = [
  { icon: Home,    label: "Início",    href: "/dashboard",          color: "text-blue-400",   active: "text-blue-400" },
  { icon: History, label: "Histórico", href: "/dashboard/history",  color: "text-purple-400", active: "text-purple-400" },
]

const RIGHT_NAV = [
  { icon: Users, label: "Duplas", href: "/dashboard/teams", color: "text-green-400", active: "text-green-400" },
]

const RANKING = { icon: Trophy, label: "Ranking", href: "/dashboard/ranking" }

const MORE_NAV = [
  { icon: BarChart3, label: "Estatísticas", href: "/dashboard/stats",    color: "text-red-400",    glow: "bg-red-500/10",    active: "border-red-500/20" },
  { icon: Swords,    label: "Comparação",   href: "/dashboard/versus",   color: "text-orange-400", glow: "bg-orange-500/10", active: "border-orange-500/20" },
  { icon: Settings,  label: "Config",       href: "/dashboard/settings", color: "text-gray-400",   glow: "bg-white/5",       active: "border-white/10" },
]

function NavItem({ icon: Icon, label, href, color, active }: { icon: React.ElementType; label: string; href: string; color: string; active: string }) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <Link href={href} prefetch={false} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1">
      <Icon className={`h-5 w-5 transition-colors ${isActive ? active : "text-gray-500"}`} />
      <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-white" : "text-gray-600"}`}>{label}</span>
    </Link>
  )
}

export function MobileBottomNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isRankingActive = pathname === RANKING.href

  return (
    <>
      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* More drawer */}
      <div className={`fixed bottom-[56px] left-0 right-0 z-50 transition-all duration-300 ease-out ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}`}>
        <div className="mx-4 mb-2 rounded-2xl border border-white/[0.08] bg-[#0d0d14]/95 p-3 backdrop-blur-xl shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mais páginas</span>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {MORE_NAV.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                    isActive ? `${item.glow} border ${item.active} ${item.color}` : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-white/[0.06] bg-[#07070c]/95 backdrop-blur-xl">
        {LEFT_NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Ranking — center highlight */}
        <Link
          href={RANKING.href}
          prefetch={false}
          className="relative flex flex-1 flex-col items-center justify-center"
        >
          <div className={`flex h-11 w-11 -translate-y-3 flex-col items-center justify-center rounded-full border transition-all duration-200 ${
            isRankingActive
              ? "border-yellow-500/50 bg-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
              : "border-white/[0.1] bg-[#111118] shadow-[0_0_12px_rgba(0,0,0,0.5)]"
          }`}>
            <Trophy className={`h-5 w-5 transition-colors ${isRankingActive ? "text-yellow-400" : "text-gray-400"}`} />
          </div>
          <span className={`-mt-2.5 text-[10px] font-medium transition-colors ${isRankingActive ? "text-yellow-400" : "text-gray-600"}`}>
            Ranking
          </span>
        </Link>

        {RIGHT_NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Mais button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1"
        >
          <MoreHorizontal className={`h-5 w-5 transition-colors ${open ? "text-white" : "text-gray-500"}`} />
          <span className={`text-[10px] font-medium transition-colors ${open ? "text-white" : "text-gray-600"}`}>Mais</span>
        </button>
      </nav>
    </>
  )
}
