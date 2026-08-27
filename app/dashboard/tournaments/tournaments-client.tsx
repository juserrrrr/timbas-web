"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight, CalendarClock, LockKeyhole, Plus, Swords, Timer, Trophy, Users } from "lucide-react"
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
  EmptyState,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import { CreateTournamentDialog } from "./create-tournament-dialog"

const FILTERS: Array<{ id: string; label: string; statuses?: TournamentStatus[] }> = [
  { id: "active", label: "Abertos e em andamento", statuses: ["REGISTRATION", "RUNNING"] },
  { id: "finished", label: "Encerrados", statuses: ["FINISHED"] },
  { id: "all", label: "Todos" },
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

function CardMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <span className="flex min-w-0 flex-col items-center border-r border-white/[0.05] px-2 py-3 text-center last:border-0"><span className="text-blue-300">{icon}</span><span className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-gray-700">{label}</span><strong className="mt-0.5 w-full truncate text-[10px] font-black text-gray-300">{value}</strong></span>
}

function TimelineRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="flex items-center justify-between gap-3 text-[10px]"><span className="flex items-center gap-1.5 text-gray-600"><CalendarClock className={`h-3.5 w-3.5 ${tone}`} />{label}</span><strong className="text-right font-bold text-gray-400">{value}</strong></div>
}

export function TournamentsClient({
  initialTournaments = null,
}: {
  /** Vem pronto do server component. Null quando ele não pôde buscar. */
  initialTournaments?: TournamentSummary[] | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tournaments, setTournaments] = useState<TournamentSummary[]>(initialTournaments ?? [])
  const [filter, setFilter] = useState("active")
  const [loading, setLoading] = useState(!initialTournaments)
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

  // O servidor já trouxe a lista, então a primeira busca do cliente repetiria a
  // mesma resposta. Aceitar convite continua sendo coisa do cliente.
  const servedFromServer = useRef(Boolean(initialTournaments))

  useEffect(() => {
    const invite = searchParams.get("invite")
    if (!invite) {
      if (servedFromServer.current) {
        servedFromServer.current = false
        return
      }
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
    const statuses = FILTERS.find((item) => item.id === filter)?.statuses
    return statuses ? tournaments.filter((tournament) => statuses.includes(tournament.status)) : tournaments
  }, [tournaments, filter])

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />

  return (
    <div className="dashboard-view space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08090d] shadow-2xl shadow-black/30">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(37,99,235,0.18),transparent_38%),radial-gradient(circle_at_92%_0%,rgba(220,38,38,0.13),transparent_38%)]" />
        <div className="relative flex flex-col gap-5 px-6 pb-6 pt-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-950/30"><Trophy className="h-6 w-6" /></span>
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Competições</p><h1 className="mt-1 text-3xl font-black tracking-tight text-white">Campeonatos</h1><p className="mt-1 text-sm text-gray-500">Chaves, grupos, partidas e resultados em um só lugar.</p></div>
          </div>
          {canCreate && <Button onClick={() => setCreating(true)} className="h-11 rounded-xl bg-blue-600 px-5 font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"><Plus className="mr-1.5 h-4 w-4" />Criar campeonato</Button>}
        </div>
        <div className="relative flex gap-2 overflow-x-auto border-t border-white/[0.07] bg-black/10 px-6 py-3 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((item) => {
            const count = item.statuses ? tournaments.filter((tournament) => item.statuses!.includes(tournament.status)).length : tournaments.length
            return <button key={item.id} onClick={() => setFilter(item.id)} className={`flex h-9 flex-shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition ${filter === item.id ? "border-blue-400/20 bg-blue-500/10 text-blue-200" : "border-transparent text-gray-500 hover:bg-white/[0.035] hover:text-white"}`}>{item.label}<span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[9px] font-black ${filter === item.id ? "bg-blue-400/15 text-blue-200" : "bg-white/[0.04] text-gray-600"}`}>{count}</span></button>
          })}
        </div>
      </section>

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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
              prefetch={false}
              className="text-left"
            >
              <Card className="group relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-[24px] border-white/[0.08] bg-[#090a0e] p-0 transition duration-300 hover:-translate-y-1 hover:border-blue-400/25 hover:shadow-2xl hover:shadow-blue-950/20">
                <div className={`h-1 w-full ${tournament.status === "RUNNING" ? "bg-emerald-500" : tournament.status === "REGISTRATION" ? "bg-gradient-to-r from-blue-500 to-red-500" : tournament.status === "FINISHED" ? "bg-blue-500" : tournament.status === "CANCELLED" ? "bg-red-500" : "bg-gray-700"}`} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/[0.08] text-blue-300"><Trophy className="h-4 w-4" /></span>
                      <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">{tournament.gameLabel || GAME_LABELS[tournament.game]}</p><h2 className="mt-1 truncate text-lg font-black text-white">{tournament.name}</h2></div>
                    </div>
                    <StatusPill tone={STATUS_TONES[tournament.status]}>{STATUS_LABELS[tournament.status]}</StatusPill>
                  </div>

                  <p className="mt-4 min-h-10 line-clamp-2 text-xs leading-relaxed text-gray-500">{tournament.description || "Competição organizada pelo Timbas."}</p>

                  {tournament.accessMode === "INVITE_ONLY" && <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/[0.08] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-blue-200"><LockKeyhole className="h-3 w-3" />Entrada somente por convite</span>}

                  <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
                    <CardMetric icon={<Swords className="h-3.5 w-3.5" />} label="Formato" value={FORMAT_LABELS[tournament.format]} />
                    <CardMetric icon={<Users className="h-3.5 w-3.5" />} label="Times" value={`${tournament.teamCount}/${tournament.maxTeams}`} />
                    <CardMetric icon={<Trophy className="h-3.5 w-3.5" />} label="Partidas" value={String(tournament.matchCount)} />
                  </div>

                  <div className="mt-4 space-y-2.5 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3">
                    <TimelineRow label="Fim das inscrições" value={tournament.registrationEndsAt ? formatDateTime(tournament.registrationEndsAt) : "Não definido"} tone="text-red-300" />
                    <TimelineRow label="Início" value={tournament.startsAt ? formatDateTime(tournament.startsAt) : "Não definido"} tone="text-blue-300" />
                    {nextLabel && <div className={`flex items-center gap-1.5 border-t border-white/[0.06] pt-2.5 text-[10px] font-black ${registrationCountdown ? "text-red-300" : startCountdown ? "text-blue-300" : "text-emerald-300"}`}><Timer className="h-3.5 w-3.5" />{nextLabel}</div>}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="min-w-0 truncate text-[10px] text-gray-600">{tournament.owner ? `Por ${tournament.owner.name}` : "Sem organizador"}</span>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-black text-gray-500 transition group-hover:text-blue-300">Abrir campeonato<ArrowRight className="h-3.5 w-3.5" /></span>
                  </div>
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
