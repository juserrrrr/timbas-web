"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  Coins,
  Settings2,
  Shirt,
  Sparkles,
  Table2,
  Users,
} from "lucide-react"
import {
  CompetitionHeader,
  ErrorState,
  PageLoading,
  StatTile,
  StatusPill,
} from "@/components/competitions/shared"
import { getDraftLeague } from "@/lib/services/draft"
import { DRAFT_STATUS_LABELS, WEEKDAY_SHORT, type DraftLeagueDetail, type DraftLeagueStatus } from "@/lib/services/draft.types"
import { DraftRoom } from "./draft-room"
import { DraftStandings } from "./draft-standings"
import { FixturesPanel } from "./fixtures-panel"
import { LeagueAdminPanel } from "./league-admin-panel"
import { MarketPanel } from "./market-panel"
import { SquadPanel } from "./squad-panel"

const STATUS_TONES: Record<DraftLeagueStatus, "neutral" | "live" | "warn" | "done"> = {
  SETUP: "warn",
  DRAFTING: "live",
  ACTIVE: "live",
  FINISHED: "done",
}

type TabId = "room" | "squad" | "fixtures" | "market" | "standings" | "admin"

export function DraftClient({ leagueId }: { leagueId: string }) {
  const router = useRouter()
  const [league, setLeague] = useState<DraftLeagueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<TabId>("standings")

  const load = useCallback(async () => {
    try {
      setLeague(await getDraftLeague(leagueId))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a liga")
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (league?.status === "DRAFTING") setTab("room")
  }, [league?.status])

  const tabs = useMemo(() => {
    if (!league) return []
    return [
      { id: "standings" as const, label: "Classificação", icon: Table2 },
      { id: "room" as const, label: "Sala do draft", icon: Sparkles },
      { id: "squad" as const, label: "Meu elenco", icon: Shirt },
      { id: "fixtures" as const, label: "Rodadas", icon: CalendarDays },
      { id: "market" as const, label: "Mercado", icon: ArrowLeftRight },
      league.access.canModerate && { id: "admin" as const, label: "Organização", icon: Settings2 },
    ].filter(Boolean) as Array<{ id: TabId; label: string; icon: typeof Table2 }>
  }, [league])

  if (loading) return <PageLoading />
  if (error || !league) return <ErrorState message={error || "Liga não encontrada"} retry={() => void load()} />

  const poolSize = league._count?.players ?? 0

  return (
    <div className="dashboard-view space-y-6">
      <button
        onClick={() => router.push("/dashboard/draft")}
        className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-gray-500 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Todas as ligas
      </button>

      <CompetitionHeader
        eyebrow="Liga Draft"
        title={league.name}
        subtitle={league.description || `${league.orderType === "SNAKE" ? "Draft snake" : "Draft linear"} · ${league.rosterSize} jogadores por elenco`}
        icon={Users}
        accent="text-emerald-400"
        accentBg="bg-emerald-500/10 border-emerald-500/20"
        actions={<StatusPill tone={STATUS_TONES[league.status]}>{DRAFT_STATUS_LABELS[league.status]}</StatusPill>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Elencos" value={league.rosters.length} icon={Users} accent="text-emerald-400" />
        <StatTile label="Pool de jogadores" value={poolSize} icon={Shirt} accent="text-blue-400" />
        <StatTile
          label="Rodadas"
          value={league.totalRounds ? `${league.currentRound}/${league.totalRounds}` : "—"}
          hint={league.matchDays.map((day) => WEEKDAY_SHORT[day]).join(" e ")}
          icon={CalendarDays}
          accent="text-violet-400"
        />
        <StatTile
          label="Moedas por vitória"
          value={league.coinsWin}
          icon={Coins}
          accent="text-amber-400"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] pb-px">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-bold transition ${
              tab === item.id
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "standings" && <DraftStandings league={league} onChanged={() => void load()} />}
      {tab === "room" && <DraftRoom league={league} onChanged={() => void load()} />}
      {tab === "squad" && <SquadPanel league={league} onChanged={() => void load()} />}
      {tab === "fixtures" && <FixturesPanel league={league} onChanged={() => void load()} />}
      {tab === "market" && <MarketPanel league={league} onChanged={() => void load()} />}
      {tab === "admin" && <LeagueAdminPanel league={league} onChanged={() => void load()} />}
    </div>
  )
}
