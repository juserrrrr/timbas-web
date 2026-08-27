"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowUpRight, CalendarDays, Database, Loader2, Play, Plus, Trash2, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorState, PageLoading, StatusPill } from "@/components/competitions/shared"
import {
  AdminEmpty,
  AdminHeader,
  AdminMetrics,
  InlineNotice,
  TabCount,
  adminTabClass,
  adminTabListClass,
} from "@/components/admin/shell"
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
  const params = useSearchParams()
  const [tab, setTab] = useState<"leagues" | "catalog">(
    params.get("tab") === "catalog" ? "catalog" : "leagues",
  )
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

  const rosters = leagues.reduce((total, league) => total + (league._count?.rosters ?? 0), 0)
  const drafting = leagues.filter((league) => league.status === "DRAFTING").length
  const active = leagues.filter((league) => league.status === "ACTIVE").length

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Competições"
        title="Liga Draft"
        subtitle="As ligas, a base de jogadores e tudo que faz a temporada rodar ficam aqui."
        icon={Users}
        accent="emerald"
        actions={
          tab === "leagues" && (
            <Button onClick={() => setCreating(true)} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Plus className="mr-1.5 h-4 w-4" />
              Criar liga
            </Button>
          )
        }
      />

      <AdminMetrics
        items={[
          { label: "Ligas", value: leagues.length, hint: "criadas no servidor", icon: Trophy, accent: "emerald" },
          { label: "Em draft", value: drafting, hint: "sala aberta agora", icon: Play, accent: "amber" },
          { label: "Em temporada", value: active, hint: "rodadas em andamento", icon: CalendarDays, accent: "sky" },
          { label: "Elencos", value: rosters, hint: "somando todas as ligas", icon: Users, accent: "violet" },
        ]}
      />

      {notice && <InlineNotice tone="ok">{notice}</InlineNotice>}
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      <Tabs value={tab} onValueChange={(value) => setTab(value as "leagues" | "catalog")} className="gap-4">
        <TabsList className={adminTabListClass()}>
          <TabsTrigger value="leagues" className={adminTabClass("emerald")}>
            <Trophy className="h-3.5 w-3.5" />
            Ligas
            <TabCount value={leagues.length} />
          </TabsTrigger>
          <TabsTrigger value="catalog" className={adminTabClass("emerald")}>
            <Database className="h-3.5 w-3.5" />
            Base de jogadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <CatalogPanel />
        </TabsContent>

        <TabsContent value="leagues">
          {leagues.length === 0 ? (
            <AdminEmpty
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
                <div
                  key={league.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:border-white/12"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-emerald-400 opacity-25 transition-opacity group-hover:opacity-70"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                      <Users className="h-4 w-4 text-emerald-400" />
                    </span>

                    <Link href={`/admin/draft/${league.id}`} className="min-w-[200px] flex-1">
                      <p className="truncate text-[13px] font-black text-white">{league.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">
                        {league._count?.rosters ?? 0} elencos · {league._count?.players ?? 0} no pool ·{" "}
                        {league.rosterSize} por elenco
                        {league.totalRounds ? ` · rodada ${league.currentRound}/${league.totalRounds}` : ""}
                      </p>
                    </Link>

                    <span className="hidden items-center gap-1.5 text-[11px] text-gray-500 sm:flex">
                      <CalendarDays className="h-3 w-3" />
                      {league.matchDays.map((day) => WEEKDAY_SHORT[day]).join(" e ")}
                    </span>

                    <StatusPill tone={STATUS_TONES[league.status]}>{DRAFT_STATUS_LABELS[league.status]}</StatusPill>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {league.status === "SETUP" && (
                        <Button
                          size="sm"
                          disabled={busyId === league.id}
                          onClick={() =>
                            void run(league.id, () => startDraft(league.id), `Draft de ${league.name} aberto.`)
                          }
                          className="h-8 bg-emerald-500 px-2.5 text-[11px] text-black hover:bg-emerald-400"
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
                        className="flex h-8 items-center gap-1 rounded-md border border-white/[0.07] px-2.5 text-[11px] font-bold text-gray-400 transition-colors hover:text-white"
                      >
                        Gerenciar
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === league.id}
                        onClick={() => void run(league.id, () => deleteDraftLeague(league.id), `${league.name} apagada.`)}
                        className="h-8 border-red-500/25 px-2.5 text-[11px] text-red-400 hover:bg-red-500/10"
                        aria-label={`Apagar ${league.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateDraftLeagueDialog open={creating} onOpenChange={setCreating} onCreated={() => void load()} />
    </div>
  )
}
