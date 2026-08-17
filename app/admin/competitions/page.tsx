"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Lock,
  LockOpen,
  Play,
  Plus,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CompetitionHeader,
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import {
  deleteTournament,
  listTournaments,
  startTournament,
  updateTournament,
} from "@/lib/services/tournaments"
import {
  FORMAT_LABELS,
  GAME_LABELS,
  STATUS_LABELS,
  type TournamentStatus,
  type TournamentSummary,
} from "@/lib/services/tournaments.types"
import { deleteDraftLeague, listDraftLeagues, startDraft, updateDraftLeague } from "@/lib/services/draft"
import { DRAFT_STATUS_LABELS, type DraftLeagueStatus, type DraftLeagueSummary } from "@/lib/services/draft.types"
import { CreateDraftLeagueDialog } from "@/app/dashboard/draft/create-draft-league-dialog"

const TOURNAMENT_TONES: Record<TournamentStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  DRAFT: "neutral",
  REGISTRATION: "warn",
  RUNNING: "live",
  FINISHED: "done",
  CANCELLED: "danger",
}

const DRAFT_TONES: Record<DraftLeagueStatus, "neutral" | "live" | "warn" | "done"> = {
  SETUP: "warn",
  DRAFTING: "live",
  ACTIVE: "live",
  FINISHED: "done",
}

export default function AdminCompetitionsPage() {
  const [tab, setTab] = useState<"tournaments" | "draft">("tournaments")
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [leagues, setLeagues] = useState<DraftLeagueSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      const [tournamentData, leagueData] = await Promise.all([listTournaments(), listDraftLeagues()])
      setTournaments(tournamentData.items)
      setLeagues(leagueData)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as competições")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error && tournaments.length === 0 && leagues.length === 0) {
    return <ErrorState message={error} retry={() => void load()} />
  }

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
        title="Competições"
        subtitle="Controle total dos campeonatos e das ligas de draft do servidor."
        icon={Trophy}
        accent="text-amber-400"
        accentBg="bg-amber-500/10 border-amber-500/20"
        actions={
          tab === "draft" && (
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
            { id: "tournaments" as const, label: "Campeonatos", icon: Trophy, count: tournaments.length },
            { id: "draft" as const, label: "Ligas Draft", icon: Users, count: leagues.length },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-bold transition ${
              tab === item.id ? "border-amber-400 text-amber-400" : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
            <span className="rounded-full bg-white/[0.06] px-1.5 text-[10px] text-gray-400">{item.count}</span>
          </button>
        ))}
      </div>

      {tab === "tournaments" &&
        (tournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nenhum campeonato criado"
            description="Use o Laboratório para gerar um de teste, ou crie um de verdade pela área de campeonatos."
          />
        ) : (
          <div className="space-y-2">
            {tournaments.map((tournament) => {
              const canStart = tournament.status === "REGISTRATION" || tournament.status === "DRAFT"
              const registrationOpen = tournament.status === "REGISTRATION"

              return (
                <Card key={tournament.id} className="border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Trophy className="h-4 w-4 flex-shrink-0 text-amber-400" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{tournament.name}</p>
                      <p className="truncate text-[11px] text-gray-600">
                        {tournament.gameLabel || GAME_LABELS[tournament.game]} · {FORMAT_LABELS[tournament.format]} ·{" "}
                        {tournament.teamCount}/{tournament.maxTeams} times · {tournament.matchCount} partidas
                        {tournament.owner ? ` · ${tournament.owner.name}` : ""}
                      </p>
                    </div>

                    <StatusPill tone={TOURNAMENT_TONES[tournament.status]}>
                      {STATUS_LABELS[tournament.status]}
                    </StatusPill>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {canStart && (
                        <Button
                          size="sm"
                          disabled={busyId === tournament.id}
                          onClick={() =>
                            void run(tournament.id, () => startTournament(tournament.id), `${tournament.name} começou.`)
                          }
                          className="h-7 bg-emerald-500 px-2 text-[11px] text-black hover:bg-emerald-400"
                        >
                          {busyId === tournament.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          <span className="ml-1">Iniciar</span>
                        </Button>
                      )}

                      {canStart && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === tournament.id}
                          onClick={() =>
                            void run(
                              tournament.id,
                              () =>
                                updateTournament(tournament.id, {
                                  status: registrationOpen ? "DRAFT" : "REGISTRATION",
                                }),
                              registrationOpen ? "Inscrições fechadas." : "Inscrições reabertas.",
                            )
                          }
                          className="h-7 px-2 text-[11px]"
                        >
                          {registrationOpen ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                          <span className="ml-1">{registrationOpen ? "Fechar" : "Abrir"}</span>
                        </Button>
                      )}

                      {tournament.status === "RUNNING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === tournament.id}
                          onClick={() =>
                            void run(
                              tournament.id,
                              () => updateTournament(tournament.id, { status: "FINISHED" }),
                              `${tournament.name} encerrado.`,
                            )
                          }
                          className="h-7 px-2 text-[11px]"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="ml-1">Encerrar</span>
                        </Button>
                      )}

                      <Link
                        href={`/dashboard/tournaments/${tournament.id}`}
                        className="flex h-7 items-center gap-1 rounded-md border border-white/[0.07] px-2 text-[11px] font-bold text-gray-400 transition hover:text-white"
                      >
                        Abrir
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === tournament.id}
                        onClick={() =>
                          void run(
                            tournament.id,
                            () => deleteTournament(tournament.id),
                            `${tournament.name} apagado.`,
                          )
                        }
                        className="h-7 border-red-500/25 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {tournament.startsAt && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-600">
                      <CalendarClock className="h-3 w-3" />
                      Início: {formatDateTime(tournament.startsAt)}
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        ))}

      {tab === "draft" &&
        (leagues.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhuma liga de draft"
            description="Crie a liga por aqui — só administradores podem abrir uma. Depois importe o pool de jogadores dentro dela."
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

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{league.name}</p>
                    <p className="truncate text-[11px] text-gray-600">
                      {league._count?.rosters ?? 0} elencos · {league._count?.players ?? 0} no pool ·{" "}
                      {league.rosterSize} por elenco
                      {league.totalRounds ? ` · rodada ${league.currentRound}/${league.totalRounds}` : ""}
                    </p>
                  </div>

                  <StatusPill tone={DRAFT_TONES[league.status]}>{DRAFT_STATUS_LABELS[league.status]}</StatusPill>

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
                        <span className="ml-1">Iniciar draft</span>
                      </Button>
                    )}

                    {league.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === league.id}
                        onClick={() =>
                          void run(
                            league.id,
                            () => updateDraftLeague(league.id, { transferWindowOpen: !league.transferWindowOpen }),
                            league.transferWindowOpen ? "Mercado fechado." : "Mercado aberto.",
                          )
                        }
                        className="h-7 px-2 text-[11px]"
                      >
                        {league.transferWindowOpen ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                        <span className="ml-1">{league.transferWindowOpen ? "Fechar mercado" : "Abrir mercado"}</span>
                      </Button>
                    )}

                    <Link
                      href={`/dashboard/draft/${league.id}`}
                      className="flex h-7 items-center gap-1 rounded-md border border-white/[0.07] px-2 text-[11px] font-bold text-gray-400 transition hover:text-white"
                    >
                      Abrir
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === league.id}
                      onClick={() =>
                        void run(league.id, () => deleteDraftLeague(league.id), `${league.name} apagada.`)
                      }
                      className="h-7 border-red-500/25 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      <CreateDraftLeagueDialog open={creating} onOpenChange={setCreating} onCreated={() => void load()} />
    </div>
  )
}
