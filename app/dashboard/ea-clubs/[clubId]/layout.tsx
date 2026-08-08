"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { BarChart3, History, LayoutDashboard, Users } from "lucide-react"

const tabs = [
  { suffix: "", label: "Visão geral", icon: LayoutDashboard },
  { suffix: "/matches", label: "Partidas", icon: History },
  { suffix: "/players", label: "Jogadores", icon: Users },
  { suffix: "/leaderboard", label: "Ranking", icon: BarChart3 },
]

export default function EaClubLayout({ children }: { children: React.ReactNode }) {
  const { clubId } = useParams<{ clubId: string }>()
  const pathname = usePathname()
  const base = `/dashboard/ea-clubs/${clubId}`
  return <div className="space-y-6"><nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">{tabs.map(tab => { const href = `${base}${tab.suffix}`; const active = tab.suffix ? pathname.startsWith(href) : pathname === href; return <Link key={href} href={href} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-blue-500/15 text-blue-400" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}><tab.icon className="h-4 w-4" />{tab.label}</Link> })}</nav>{children}</div>
}
