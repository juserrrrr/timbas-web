"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, CalendarDays, Coins, Shirt, Users } from "lucide-react"
import { ErrorState, PageLoading, StatusPill } from "@/components/competitions/shared"
import { AdminHeader, AdminMetrics } from "@/components/admin/shell"
import { LeagueAdminPanel } from "@/components/competitions/league-admin-panel"
import { formatMoney } from "@/lib/money"
import { getDraftLeague } from "@/lib/services/draft"
import {
  DRAFT_STATUS_LABELS,
  WEEKDAY_SHORT,
  type DraftLeagueDetail,
  type DraftLeagueStatus,
} from "@/lib/services/draft.types"

const STATUS_TONES: Record<DraftLeagueStatus, "neutral" | "live" | "warn" | "done"> = {
  SETUP: "warn",
  DRAFTING: "live",
  ACTIVE: "live",
  FINISHED: "done",
}

export default function AdminDraftLeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [league, setLeague] = useState<DraftLeagueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      setLeague(await getDraftLeague(id))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a liga")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error || !league) return <ErrorState message={error || "Liga não encontrada"} retry={() => void load()} />

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Liga Draft"
        title={league.name}
        subtitle="Tudo que muda o rumo da liga fica aqui. O dashboard serve só para jogar."
        icon={Users}
        accent="emerald"
        backHref="/admin/draft"
        backLabel="Todas as ligas"
        actions={
          <>
            <StatusPill tone={STATUS_TONES[league.status]}>{DRAFT_STATUS_LABELS[league.status]}</StatusPill>
            <Link
              href={`/dashboard/draft/${league.id}`}
              className="flex h-9 items-center gap-1 rounded-lg border border-white/[0.08] px-3 text-[12px] font-bold text-gray-400 transition-colors hover:text-white"
            >
              Ver como jogador
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      <AdminMetrics
        items={[
          { label: "Elencos", value: league.rosters.length, hint: "times na liga", icon: Users, accent: "emerald" },
          {
            label: "Pool",
            value: league._count?.players ?? 0,
            hint: "jogadores disponíveis",
            icon: Shirt,
            accent: "blue",
          },
          {
            label: "Rodadas",
            value: league.totalRounds ? `${league.currentRound}/${league.totalRounds}` : "-",
            hint: league.matchDays.map((day) => WEEKDAY_SHORT[day]).join(" e "),
            icon: CalendarDays,
            accent: "violet",
          },
          {
            label: "Prêmio",
            value: formatMoney(league.coinsWin),
            hint: "por vitória na rodada",
            icon: Coins,
            accent: "amber",
          },
        ]}
      />

      <LeagueAdminPanel league={league} onChanged={() => void load()} />
    </div>
  )
}
