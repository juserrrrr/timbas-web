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
  Trash2,
  Trophy,
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
import { deleteTournament, listTournaments, startTournament, updateTournament } from "@/lib/services/tournaments"
import {
  FORMAT_LABELS,
  GAME_LABELS,
  STATUS_LABELS,
  type TournamentStatus,
  type TournamentSummary,
} from "@/lib/services/tournaments.types"

const TONES: Record<TournamentStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  DRAFT: "neutral",
  REGISTRATION: "warn",
  RUNNING: "live",
  FINISHED: "done",
  CANCELLED: "danger",
}

export default function AdminCompetitionsPage() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      const { items } = await listTournaments()
      setTournaments(items)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os campeonatos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error && tournaments.length === 0) return <ErrorState message={error} retry={() => void load()} />

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
        title="Campeonatos"
        subtitle="Iniciar, encerrar, abrir inscrições e apagar qualquer campeonato do servidor."
        icon={Trophy}
        accent="text-amber-400"
        accentBg="bg-amber-500/10 border-amber-500/20"
      />

      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nenhum campeonato criado"
          description="Gere um de teste pelo Laboratório, ou crie um de verdade pela área de campeonatos do dashboard."
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

                  <StatusPill tone={TONES[tournament.status]}>{STATUS_LABELS[tournament.status]}</StatusPill>

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
                        void run(tournament.id, () => deleteTournament(tournament.id), `${tournament.name} apagado.`)
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
      )}
    </div>
  )
}
