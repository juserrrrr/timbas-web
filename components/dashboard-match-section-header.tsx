"use client"

import { Swords } from "lucide-react"
import { usePathname } from "next/navigation"
import { CreateMatchLink } from "@/app/(dashboard)/matches/create-match-link"
import { CustomMatchSubnav } from "@/components/custom-match-subnav"
import { TIMBAS_SERVER_NAME } from "@/lib/servers"
import { normalizeDashboardPathname } from "@/lib/navigation"

const MATCH_ROUTES = new Set(["/matches", "/history", "/stats", "/teams", "/versus"])

const PAGE_COPY: Record<string, { title: string; description: string }> = {
  "/matches": {
    title: "Partidas personalizadas",
    description: `Crie uma partida ou acompanhe as que estão em andamento em ${TIMBAS_SERVER_NAME}.`,
  },
  "/history": {
    title: "Partidas personalizadas",
    description: "Crie novas partidas e consulte tudo o que já foi jogado.",
  },
  "/stats": {
    title: "Estatísticas",
    description: "Acompanhe o desempenho detalhado por jogador",
  },
  "/teams": {
    title: "Melhores Duplas",
    description: "Com quem você mais ganha partidas",
  },
  "/versus": {
    title: "Comparação",
    description: "Compare o desempenho de dois jogadores",
  },
}

export function DashboardMatchSectionHeader() {
  const pathname = normalizeDashboardPathname(usePathname())
  if (!MATCH_ROUTES.has(pathname)) return null

  const copy = PAGE_COPY[pathname]
  const statsSection = pathname === "/stats" || pathname === "/teams" || pathname === "/versus"
  const showCreate = pathname === "/matches" || pathname === "/history"

  return <div className="mb-6 space-y-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
          {(pathname === "/matches" || pathname === "/history") && <Swords className="h-7 w-7 text-emerald-400" />}
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{copy.description}</p>
      </div>
      {showCreate && <CreateMatchLink />}
    </div>

    <CustomMatchSubnav section="matches" />
    {statsSection && <CustomMatchSubnav section="stats" />}
  </div>
}
