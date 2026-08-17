"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, CalendarDays, Coins, Shirt, Users } from "lucide-react"
import {
  CompetitionHeader,
  ErrorState,
  PageLoading,
  StatTile,
  StatusPill,
} from "@/components/competitions/shared"
import { LeagueAdminPanel } from "@/components/competitions/league-admin-panel"
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
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/draft"
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Liga Draft
        </Link>
        <Link
          href={`/dashboard/draft/${league.id}`}
          className="flex items-center gap-1 text-xs font-bold text-gray-500 transition hover:text-white"
        >
          Ver como jogador
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <CompetitionHeader
        eyebrow="Gestão da liga"
        title={league.name}
        subtitle="Tudo que muda o rumo da liga fica aqui. O dashboard serve só para jogar."
        icon={Users}
        accent="text-emerald-400"
        accentBg="bg-emerald-500/10 border-emerald-500/20"
        actions={<StatusPill tone={STATUS_TONES[league.status]}>{DRAFT_STATUS_LABELS[league.status]}</StatusPill>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Elencos" value={league.rosters.length} icon={Users} accent="text-emerald-400" />
        <StatTile label="Pool de jogadores" value={league._count?.players ?? 0} icon={Shirt} accent="text-blue-400" />
        <StatTile
          label="Rodadas"
          value={league.totalRounds ? `${league.currentRound}/${league.totalRounds}` : "-"}
          hint={league.matchDays.map((day) => WEEKDAY_SHORT[day]).join(" e ")}
          icon={CalendarDays}
          accent="text-violet-400"
        />
        <StatTile label="Moedas por vitória" value={league.coinsWin} icon={Coins} accent="text-amber-400" />
      </div>

      <LeagueAdminPanel league={league} onChanged={() => void load()} />
    </div>
  )
}
