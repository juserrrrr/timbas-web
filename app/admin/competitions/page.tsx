"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Lock,
  LockOpen,
  Play,
  Search,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ErrorState, PageLoading, StatusPill, formatDateTime } from "@/components/competitions/shared"
import { AdminEmpty, AdminHeader, AdminMetrics, InlineNotice } from "@/components/admin/shell"
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

const FILTERS: Array<{ id: TournamentStatus | "ALL"; label: string }> = [
  { id: "ALL", label: "Todos" },
  { id: "REGISTRATION", label: "Inscrições" },
  { id: "RUNNING", label: "Em andamento" },
  { id: "DRAFT", label: "Rascunho" },
  { id: "FINISHED", label: "Encerrados" },
]

export default function AdminCompetitionsPage() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [filter, setFilter] = useState<TournamentStatus | "ALL">("ALL")
  const [search, setSearch] = useState("")

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

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    return tournaments.filter((tournament) => {
      const matchesStatus = filter === "ALL" || tournament.status === filter
      const matchesTerm = !term || tournament.name.toLocaleLowerCase("pt-BR").includes(term)
      return matchesStatus && matchesTerm
    })
  }, [filter, search, tournaments])

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

  const count = (status: TournamentStatus) => tournaments.filter((item) => item.status === status).length

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Competições"
        title="Campeonatos"
        subtitle="Iniciar, encerrar, abrir inscrições e apagar qualquer campeonato do servidor."
        icon={Trophy}
        accent="amber"
      />

      <AdminMetrics
        items={[
          { label: "Campeonatos", value: tournaments.length, hint: "no servidor", icon: Trophy, accent: "amber" },
          { label: "Inscrições", value: count("REGISTRATION"), hint: "aceitando times", icon: Users, accent: "sky" },
          { label: "Em andamento", value: count("RUNNING"), hint: "com chave rodando", icon: Play, accent: "emerald" },
          {
            label: "Encerrados",
            value: count("FINISHED"),
            hint: "com campeão definido",
            icon: CheckCircle2,
            accent: "slate",
          },
        ]}
      />

      {notice && <InlineNotice tone="ok">{notice}</InlineNotice>}
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      {tournaments.length === 0 ? (
        <AdminEmpty
          icon={Trophy}
          title="Nenhum campeonato criado"
          description="Gere um de teste pelo Laboratório, ou crie um de verdade pela área de campeonatos do dashboard."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar campeonato pelo nome"
                className="h-10 border-white/10 bg-black/25 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-[11px] font-black transition-colors ${
                    filter === option.id
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                      : "border-white/[0.07] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <AdminEmpty
              icon={Search}
              title="Nada com esse filtro"
              description="Nenhum campeonato combina com a busca ou com o estado escolhido."
            />
          ) : (
            <div className="space-y-2">
              {visible.map((tournament) => {
                const canStart = tournament.status === "REGISTRATION" || tournament.status === "DRAFT"
                const registrationOpen = tournament.status === "REGISTRATION"

                return (
                  <div
                    key={tournament.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:border-white/12"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-amber-400 opacity-25 transition-opacity group-hover:opacity-70"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                        <Trophy className="h-4 w-4 text-amber-400" />
                      </span>

                      <div className="min-w-[200px] flex-1">
                        <p className="truncate text-[13px] font-black text-white">{tournament.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                          {tournament.gameLabel || GAME_LABELS[tournament.game]} · {FORMAT_LABELS[tournament.format]} ·{" "}
                          {tournament.teamCount}/{tournament.maxTeams} times · {tournament.matchCount} partidas
                          {tournament.owner ? ` · ${tournament.owner.name}` : ""}
                        </p>
                        {tournament.startsAt && (
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-600">
                            <CalendarClock className="h-3 w-3" />
                            Início {formatDateTime(tournament.startsAt)}
                          </p>
                        )}
                      </div>

                      <StatusPill tone={TONES[tournament.status]}>{STATUS_LABELS[tournament.status]}</StatusPill>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {canStart && (
                          <Button
                            size="sm"
                            disabled={busyId === tournament.id}
                            onClick={() =>
                              void run(
                                tournament.id,
                                () => startTournament(tournament.id),
                                `${tournament.name} começou.`,
                              )
                            }
                            className="h-8 bg-emerald-500 px-2.5 text-[11px] text-black hover:bg-emerald-400"
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
                            className="h-8 border-white/10 px-2.5 text-[11px]"
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
                            className="h-8 border-white/10 px-2.5 text-[11px]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="ml-1">Encerrar</span>
                          </Button>
                        )}

                        <Link
                          href={`/dashboard/tournaments/${tournament.id}`}
                          className="flex h-8 items-center gap-1 rounded-md border border-white/[0.07] px-2.5 text-[11px] font-bold text-gray-400 transition-colors hover:text-white"
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
                          className="h-8 border-red-500/25 px-2.5 text-[11px] text-red-400 hover:bg-red-500/10"
                          aria-label={`Apagar ${tournament.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
