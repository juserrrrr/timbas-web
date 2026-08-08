"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { BarChart3, History, LayoutDashboard, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEaClubs } from "@/lib/services/ea-clubs"
import type { EaClub } from "@/lib/services/ea-clubs.types"

const tabs = [
  { suffix: "", label: "Visão geral", icon: LayoutDashboard },
  { suffix: "/matches", label: "Partidas", icon: History },
  { suffix: "/players", label: "Jogadores", icon: Users },
  { suffix: "/leaderboard", label: "Ranking", icon: BarChart3 },
]

export default function EaClubLayout({ children }: { children: React.ReactNode }) {
  const { clubId } = useParams<{ clubId: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const [clubs, setClubs] = useState<EaClub[]>([])
  const base = `/dashboard/ea-clubs/${clubId}`
  useEffect(() => { void getEaClubs().then(setClubs).catch(() => setClubs([])) }, [])
  return <div className="space-y-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">{tabs.map(tab => { const href = `${base}${tab.suffix}`; const active = tab.suffix ? pathname.startsWith(href) : pathname === href; return <Link key={href} href={href} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-blue-500/15 text-blue-400" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}><tab.icon className="h-4 w-4" />{tab.label}</Link> })}</nav>{clubs.length > 1 && <Select value={clubId} onValueChange={value => router.push(`/dashboard/ea-clubs/${value}`)}><SelectTrigger className="w-full lg:w-[240px]"><SelectValue placeholder="Trocar de clube" /></SelectTrigger><SelectContent>{clubs.map(club => <SelectItem key={club.id} value={club.id}>{club.nickname || club.name}</SelectItem>)}</SelectContent></Select>}</div>{children}</div>
}
