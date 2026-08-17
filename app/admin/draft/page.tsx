"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, CalendarDays, Database, Loader2, Play, Plus, Trash2, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CompetitionHeader,
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
} from "@/components/competitions/shared"
import { CreateDraftLeagueDialog } from "@/components/competitions/create-draft-league-dialog"
import { deleteDraftLeague, listDraftLeagues, startDraft } from "@/lib/services/draft"
import {
  DRAFT_STATUS_LABELS,
  WEEKDAY_SHORT,
  type DraftLeagueStatus,
  type DraftLeagueSummary,
} from "@/lib/services/draft.types"
import { CatalogPanel } from "./catalog-panel"

const STATUS_TONES: Record<DraftLeagueStatus, "neutral" | "live" | "warn" | "done"> = {
  SETUP: "warn",
  DRAFTING: "live",
  ACTIVE: "live",
  FINISHED: "done",
}

export default function AdminDraftPage() {
  const [tab, setTab] = useState<"leagues" | "catalog">("leagues")
  const [leagues, setLeagues] = useState<DraftLeagueSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
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
  if (error && leagues.length === 0) return <ErrorState message={error} retry={() => void load()} />

  const run = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusyId(id)
    setError("")
    try {
      await action()
      setNotice(message)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className="space-y-6">
      <CompetitionHeader
        eyebrow="Administração"
        title="Liga Draft"
        subtitle="As ligas, a base de jogadores e tudo que faz a temporada rodar ficam aqui."
        icon={Users}
        accent="text-emerald-400"
        accentBg="bg-emerald-500/10 border-emerald-500/20"
        actions={
          tab === "leagues" && (
            <Button onClick={() => setCreating(true)} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Plus className="mr-1.5 h-4 w-4" />
              Criar liga
            </Button>
          )
        }
      />

      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      <div className="flex gap-1.5 border-b border-white/[0.06] pb-px">
        {(
          [
            { id: "leagues" as const, label: "Ligas", icon: Trophy, count: leagues.length },
            { id: "catalog" as const, label: "Base de jogadores", icon: Database },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-bold transition ${
              tab === item.id
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-white/[0.06] px-1.5 text-[10px] text-gray-400">{item.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "catalog" ? (
        <CatalogPanel />
      ) : leagues.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma liga criada"
          description="Crie a liga, monte a base de jogadores na aba ao lado e mande o pool para ela. Depois é só abrir o draft."
          action={
            <Button onClick={() => setCreating(true)} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Plus className="mr-1.5 h-4 w-4" />
              Criar liga
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {leagues.map((league) => (
            <Card key={league.id} className="border-white/[0.07] bg-white/[0.025] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Users className="h-4 w-4 flex-shrink-0 text-emerald-400" />

                <Link href={`/admin/draft/${league.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{league.name}</p>
                  <p className="truncate text-[11px] text-gray-600">
                    {league._count?.rosters ?? 0} elencos · {league._count?.players ?? 0} no pool ·{" "}
                    {league.rosterSize} por elenco
                    {league.totalRounds ? ` · rodada ${league.currentRound}/${league.totalRounds}` : ""}
                  </p>
                </Link>

                <span className="hidden items-center gap-1 text-[11px] text-gray-600 sm:flex">
                  <CalendarDays className="h-3 w-3" />
                  {league.matchDays.map((day) => WEEKDAY_SHORT[day]).join(" e ")}
                </span>

                <StatusPill tone={STATUS_TONES[league.status]}>{DRAFT_STATUS_LABELS[league.status]}</StatusPill>

                <div className="flex flex-wrap items-center gap-1.5">
                  {league.status === "SETUP" && (
                    <Button
                      size="sm"
                      disabled={busyId === league.id}
                      onClick={() => void run(league.id, () => startDraft(league.id), `Draft de ${league.name} aberto.`)}
                      className="h-7 bg-emerald-500 px-2 text-[11px] text-black hover:bg-emerald-400"
                    >
                      {busyId === league.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      <span className="ml-1">Abrir draft</span>
                    </Button>
                  )}

                  <Link
                    href={`/admin/draft/${league.id}`}
                    className="flex h-7 items-center gap-1 rounded-md border border-white/[0.07] px-2 text-[11px] font-bold text-gray-400 transition hover:text-white"
                  >
                    Gerenciar
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === league.id}
                    onClick={() => void run(league.id, () => deleteDraftLeague(league.id), `${league.name} apagada.`)}
                    className="h-7 border-red-500/25 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateDraftLeagueDialog open={creating} onOpenChange={setCreating} onCreated={() => void load()} />
    </div>
  )
}
