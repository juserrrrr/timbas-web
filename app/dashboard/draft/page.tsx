"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Coins, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  CompetitionHeader,
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
} from "@/components/competitions/shared"
import { listDraftLeagues } from "@/lib/services/draft"
import { DRAFT_STATUS_LABELS, WEEKDAY_SHORT, type DraftLeagueStatus, type DraftLeagueSummary } from "@/lib/services/draft.types"

const STATUS_TONES: Record<DraftLeagueStatus, "neutral" | "live" | "warn" | "done"> = {
  SETUP: "warn",
  DRAFTING: "live",
  ACTIVE: "live",
  FINISHED: "done",
}

export default function DraftLeaguesPage() {
  const router = useRouter()
  const [leagues, setLeagues] = useState<DraftLeagueSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLeagues(await listDraftLeagues())
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as ligas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />

  return (
    <div className="dashboard-view space-y-6">
      <CompetitionHeader
        eyebrow="Competições"
        title="Liga Draft"
        subtitle="Cada um escolhe seus jogadores no draft, escala o time e joga as rodadas da temporada."
        icon={Users}
        accent="text-emerald-400"
        accentBg="bg-emerald-500/10 border-emerald-500/20"
        actions={
          <Link
            href="/dashboard/wallet"
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/[0.12]"
          >
            <Coins className="h-4 w-4" />
            Minhas moedas
          </Link>
        }
      />

      {leagues.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma liga de draft ainda"
          description="As ligas são abertas pela administração. Assim que uma existir, ela aparece aqui para você entrar, montar seu elenco e jogar as rodadas."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leagues.map((league) => (
            <button key={league.id} onClick={() => router.push(`/dashboard/draft/${league.id}`)} className="text-left">
              <Card className="h-full border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-lg font-black text-white">{league.name}</h2>
                  <StatusPill tone={STATUS_TONES[league.status]}>{DRAFT_STATUS_LABELS[league.status]}</StatusPill>
                </div>

                {league.description && <p className="mt-2 line-clamp-2 text-sm text-gray-500">{league.description}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {league._count?.rosters ?? 0} elencos
                  </span>
                  <span>{league._count?.players ?? 0} jogadores no pool</span>
                  <span>{league.rosterSize} por elenco</span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
                  <span className="flex items-center gap-1 text-[11px] text-gray-600">
                    <CalendarDays className="h-3 w-3" />
                    {league.matchDays.map((day) => WEEKDAY_SHORT[day]).join(" e ")} às {league.matchHour}h
                  </span>
                  <span className="truncate text-[11px] text-gray-600">
                    {league.staff?.[0]?.user.name ? `por ${league.staff[0].user.name}` : ""}
                  </span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

    </div>
  )
}
