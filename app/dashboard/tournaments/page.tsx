"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CalendarClock, Plus, Timer, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { joinTournamentByInvite, listTournaments } from "@/lib/services/tournaments"
import { getMyPermissions } from "@/lib/services/access"
import {
  FORMAT_LABELS,
  GAME_LABELS,
  STATUS_LABELS,
  type TournamentStatus,
  type TournamentSummary,
} from "@/lib/services/tournaments.types"
import {
  CompetitionHeader,
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import { CreateTournamentDialog } from "./create-tournament-dialog"

const FILTERS: Array<{ id: string; label: string; status?: TournamentStatus }> = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Inscrições abertas", status: "REGISTRATION" },
  { id: "running", label: "Em andamento", status: "RUNNING" },
  { id: "finished", label: "Encerrados", status: "FINISHED" },
]

const STATUS_TONES: Record<TournamentStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  DRAFT: "neutral",
  REGISTRATION: "warn",
  RUNNING: "live",
  FINISHED: "done",
  CANCELLED: "danger",
}

function countdownLabel(target: string | null, now: number): string | null {
  if (!target) return null
  const diff = new Date(target).getTime() - now
  if (diff <= 0) return null
  const total = Math.floor(diff / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return days > 0
    ? `${days}d ${hours}h ${minutes}m`
    : hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : `${minutes}m ${String(seconds).padStart(2, "0")}s`
}

export default function TournamentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [canCreate, setCanCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
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
    const invite = searchParams.get("invite")
    if (!invite) {
      void load()
      return
    }
    setLoading(true)
    joinTournamentByInvite(invite)
      .then(({ tournamentId }) => router.replace(`/dashboard/tournaments/${tournamentId}`))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Não foi possível aceitar o convite")
        setLoading(false)
      })
  }, [load, router, searchParams])

  useEffect(() => {
    void getMyPermissions().then((result) => setCanCreate(result.permissions.includes("tournament.create"))).catch(() => setCanCreate(false))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const visible = useMemo(() => {
    const status = FILTERS.find((item) => item.id === filter)?.status
    return status ? tournaments.filter((tournament) => tournament.status === status) : tournaments
  }, [tournaments, filter])

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />

  return (
    <div className="dashboard-view space-y-6">
      <CompetitionHeader
        eyebrow="Competições"
        title="Campeonatos"
        subtitle="Monte chaves de qualquer jogo e valide os resultados com segurança."
        icon={Trophy}
        actions={canCreate ?
          <Button onClick={() => setCreating(true)} className="bg-amber-500 text-black hover:bg-amber-400">
            <Plus className="mr-1.5 h-4 w-4" />
            Criar campeonato
          </Button> : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              filter === item.id
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nenhum campeonato por aqui"
          description="Crie o primeiro campeonato. Você escolhe o jogo, o formato e o ritmo das partidas."
          action={canCreate ?
            <Button onClick={() => setCreating(true)} className="bg-amber-500 text-black hover:bg-amber-400">
              <Plus className="mr-1.5 h-4 w-4" />
              Criar campeonato
            </Button> : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((tournament) => {
            const registrationCountdown = tournament.status === "REGISTRATION"
              ? countdownLabel(tournament.registrationEndsAt, now)
              : null
            const startCountdown = countdownLabel(tournament.startsAt, now)
            const nextLabel = registrationCountdown
              ? `Inscrições encerram em ${registrationCountdown}`
              : startCountdown
                ? `Campeonato começa em ${startCountdown}`
                : tournament.status === "RUNNING"
                  ? "Campeonato em andamento"
                  : null
            return (
            <Link
              key={tournament.id}
              href={`/dashboard/tournaments/${tournament.id}`}
              prefetch
              className="text-left"
            >
              <Card className="h-full border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-amber-500/30 hover:bg-amber-500/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      {tournament.gameLabel || GAME_LABELS[tournament.game]}
                    </p>
                    <h2 className="truncate text-lg font-black text-white">{tournament.name}</h2>
                  </div>
                  <StatusPill tone={STATUS_TONES[tournament.status]}>{STATUS_LABELS[tournament.status]}</StatusPill>
                </div>

                {tournament.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{tournament.description}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-400">{FORMAT_LABELS[tournament.format]}</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {tournament.teamCount}/{tournament.maxTeams} times
                  </span>
                  <span>{tournament.matchCount} partidas</span>
                </div>

                <div className="mt-4 space-y-2 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-gray-500"><CalendarClock className="h-3.5 w-3.5 text-amber-400" />Fim das inscrições</span>
                    <span className="font-semibold text-gray-300">{tournament.registrationEndsAt ? formatDateTime(tournament.registrationEndsAt) : "Não definido"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-gray-500"><CalendarClock className="h-3.5 w-3.5 text-blue-400" />Início</span>
                    <span className="font-semibold text-gray-300">{tournament.startsAt ? formatDateTime(tournament.startsAt) : "Não definido"}</span>
                  </div>
                  {nextLabel && <div className={`flex items-center gap-1.5 border-t border-white/[0.06] pt-2 text-[11px] font-black ${registrationCountdown ? "text-amber-300" : startCountdown ? "text-blue-300" : "text-emerald-300"}`}><Timer className="h-3.5 w-3.5" />{nextLabel}</div>}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
                  <span className="truncate text-[11px] text-gray-600">
                    {tournament.owner ? `Organizado por ${tournament.owner.name}` : "Sem organizador"}
                  </span>
                  <span className="text-[11px] text-gray-600">Criado em {formatDateTime(tournament.createdAt)}</span>
                </div>
              </Card>
            </Link>
            )
          })}
        </div>
      )}

      {canCreate && <CreateTournamentDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => router.push(`/dashboard/tournaments/${id}`)}
      />}
    </div>
  )
}
