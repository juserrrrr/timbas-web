"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  BarChart3,
  Camera,
  GitBranch,
  ListOrdered,
  Link2,
  Loader2,
  Play,
  ShieldCheck,
  Swords,
  Table2,
  Trophy,
  Users,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CompetitionHeader,
  ErrorState,
  PageLoading,
  StatTile,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import { ReportResultDialog } from "@/components/competitions/report-result-dialog"
import { declareWalkover, getTournament, reportResult, startTournament, updateTournament } from "@/lib/services/tournaments"
import {
  FORMAT_LABELS,
  GAME_LABELS,
  STATUS_LABELS,
  type TournamentDetail,
  type TournamentMatch,
  type TournamentStatus,
} from "@/lib/services/tournaments.types"
import { BracketView } from "./bracket-view"
import { MatchRoomDialog } from "./match-room"
import { MatchesView } from "./matches-view"
import { ProofReviewPanel } from "./proof-review-panel"
import { StaffPanel } from "./staff-panel"
import { StandingsView } from "./standings-view"
import { TeamsPanel } from "./teams-panel"
import { EaStatsView } from "./ea-stats-view"
import { matchTiming } from "@/lib/tournament-match-timing"
import { brasiliaLocalToIso } from "@/lib/date-time"

const STATUS_TONES: Record<TournamentStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  DRAFT: "neutral",
  REGISTRATION: "warn",
  RUNNING: "live",
  FINISHED: "done",
  CANCELLED: "danger",
}

type TabId = "bracket" | "standings" | "my-matches" | "matches" | "teams" | "ea-stats" | "proofs" | "staff"

export function TournamentClient({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedMatchId = searchParams.get("match")
  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<TabId>("bracket")
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null)
  const [photoMatch, setPhotoMatch] = useState<TournamentMatch | null>(null)
  const [starting, setStarting] = useState(false)
  const [notice, setNotice] = useState("")
  const [now, setNow] = useState(() => Date.now())
  const [startWhen, setStartWhen] = useState("")
  const initialTabChosen = useRef(false)

  const load = useCallback(async () => {
    try {
      const next = await getTournament(tournamentId)
      setTournament(next)
      if (!initialTabChosen.current && !requestedMatchId && next.status === "FINISHED" && next.game === "EA_FC") {
        setTab("ea-stats")
      }
      initialTabChosen.current = true
      setSelectedMatch((current) => {
        const id = current?.id ?? requestedMatchId
        return id ? next.matches.find((match) => match.id === id) ?? null : null
      })
      if (requestedMatchId) setTab("matches")
      setPhotoMatch((current) => current ? next.matches.find((match) => match.id === current.id) ?? null : null)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o campeonato")
    } finally {
      setLoading(false)
    }
  }, [requestedMatchId, tournamentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const tabs = useMemo(() => {
    if (!tournament) return []
    const hasBracket = tournament.matches.some((match) =>
      ["WINNERS", "LOSERS", "GRAND_FINAL", "THIRD_PLACE"].includes(match.phase),
    )
    const hasTable = tournament.matches.some((match) => ["GROUP", "LEAGUE"].includes(match.phase))
    const pendingProofs = tournament.matches.filter((match) => match.status === "AWAITING_PROOF").length

    return [
      hasBracket && { id: "bracket" as const, label: "Chave", icon: GitBranch },
      (hasTable || tournament.matches.length === 0) && { id: "standings" as const, label: "Classificação", icon: Table2 },
      tournament.access.teamIds.length > 0 && { id: "my-matches" as const, label: "Minhas partidas", icon: Play },
      { id: "matches" as const, label: "Partidas", icon: Swords },
      { id: "teams" as const, label: "Times", icon: Users },
      tournament.game === "EA_FC" && { id: "ea-stats" as const, label: tournament.status === "FINISHED" ? "Premiações e estatísticas" : "Estatísticas EA", icon: BarChart3 },
      tournament.access.canModerate && {
        id: "proofs" as const,
        label: "Aprovações",
        icon: Camera,
        badge: pendingProofs || undefined,
      },
      { id: "staff" as const, label: "Organização", icon: ShieldCheck },
    ].filter(Boolean) as Array<{ id: TabId; label: string; icon: typeof GitBranch; badge?: number }>
  }, [tournament])

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((item) => item.id === tab)) setTab(tabs[0].id)
  }, [tabs, tab])

  if (loading) return <PageLoading />
  if (error || !tournament) return <ErrorState message={error || "Campeonato não encontrado"} retry={() => void load()} />

  const start = async () => {
    setStarting(true)
    setNotice("")
    try {
      await startTournament(tournament.id)
      await load()
      setNotice("Chaveamento gerado. Boa sorte!")
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Não foi possível iniciar o campeonato.")
    } finally {
      setStarting(false)
    }
  }

  const canOpenRoom = (match: TournamentMatch | null) =>
    match !== null &&
    Boolean(match.homeTeamId && match.awayTeamId) &&
    (tournament.access.canModerate ||
      tournament.access.teamIds.some((id) => id === match.homeTeamId || id === match.awayTeamId))

  const canReport =
    photoMatch !== null &&
    Boolean(photoMatch.homeTeamId && photoMatch.awayTeamId) &&
    photoMatch.status !== "FINISHED" &&
    photoMatch.status !== "WALKOVER" &&
    (tournament.access.canModerate ||
      tournament.access.teamIds.some((id) => id === photoMatch.homeTeamId || id === photoMatch.awayTeamId))

  const finishedMatches = tournament.matches.filter(
    (match) => match.status === "FINISHED" || match.status === "WALKOVER",
  ).length
  const myMatches = tournament.matches.filter((match) => tournament.access.teamIds.some((id) => id === match.homeTeamId || id === match.awayTeamId))
  const nextMatch = myMatches.find((match) => match.status === "READY" || match.status === "AWAITING_PROOF" || match.status === "DISPUTED") ?? null
  const nextMatchTiming = nextMatch ? matchTiming(nextMatch, tournament, now) : null
  const canRegister = (tournament.status === "REGISTRATION" || tournament.status === "DRAFT") && tournament.access.canView && tournament.access.teamIds.length === 0 && tournament.teams.length < tournament.maxTeams
  const startsAtMs = tournament.startsAt ? new Date(tournament.startsAt).getTime() : null
  const untilStart = startsAtMs === null ? null : Math.max(0, startsAtMs - now)
  const countdown = untilStart === null ? null : {
    days: Math.floor(untilStart / 86_400_000),
    hours: Math.floor((untilStart % 86_400_000) / 3_600_000),
    minutes: Math.floor((untilStart % 3_600_000) / 60_000),
    seconds: Math.floor((untilStart % 60_000) / 1000),
  }

  const saveStart = async () => {
    if (!startWhen) return
    setStarting(true)
    try {
      await updateTournament(tournament.id, { startsAt: brasiliaLocalToIso(startWhen) })
      await load()
      setNotice("Horário de início definido.")
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Não foi possível definir o início.")
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="dashboard-view space-y-6">
      <button
        onClick={() => router.push("/dashboard/tournaments")}
        className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-gray-500 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Todos os campeonatos
      </button>

      <CompetitionHeader
        eyebrow={tournament.gameLabel || GAME_LABELS[tournament.game]}
        title={tournament.name}
        subtitle={tournament.description || FORMAT_LABELS[tournament.format]}
        icon={Trophy}
        actions={
          <>
            <StatusPill tone={STATUS_TONES[tournament.status]} className="h-9 rounded-md px-3 py-0">{STATUS_LABELS[tournament.status]}</StatusPill>
            {tournament.access.canManage && tournament.inviteCode && (
              <Button
                variant="outline"
                onClick={() => {
                  const link = `${window.location.origin}/dashboard/tournaments?invite=${tournament.inviteCode}`
                  void navigator.clipboard.writeText(link).then(() => setNotice("Link de convite copiado."))
                }}
              >
                <Link2 className="mr-1.5 h-4 w-4" />
                Copiar convite
              </Button>
            )}
            {tournament.access.canManage &&
              (tournament.status === "REGISTRATION" || tournament.status === "DRAFT") && (
                <Button
                  onClick={() => void start()}
                  disabled={starting || tournament.teams.length < 2}
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  {starting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
                  Iniciar campeonato
                </Button>
              )}
          </>
        }
      />

      {notice && (
        <p className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">
          {notice}
        </p>
      )}

      {canRegister && (
        <button onClick={() => setTab("teams")} className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-amber-400/35 bg-gradient-to-r from-amber-500/15 to-orange-500/[0.06] p-4 text-left transition hover:border-amber-400/60">
          <span><span className="block text-base font-black text-white">Inscreva seu time neste campeonato</span><span className="mt-1 block text-xs text-amber-100/60">Valide seu clube da EA e garanta sua vaga. Cada usuário pode representar somente um time.</span></span>
          <span className="flex flex-shrink-0 items-center rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-black"><UserPlus className="mr-1.5 h-4 w-4" />Inscrever meu time</span>
        </button>
      )}

      <div className={`rounded-2xl border p-4 ${untilStart !== null && untilStart > 0 ? "border-blue-500/30 bg-blue-500/[0.06]" : "border-emerald-500/25 bg-emerald-500/[0.05]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${untilStart !== null && untilStart > 0 ? "bg-blue-500/15 text-blue-300" : "bg-emerald-500/15 text-emerald-300"}`}><CalendarClock className="h-5 w-5" /></span>
            <span>
              <span className="block text-[10px] font-black uppercase tracking-wider text-gray-500">Início do campeonato</span>
              <span className="mt-0.5 block text-sm font-black text-white">{tournament.startsAt ? formatDateTime(tournament.startsAt) : "A organização ainda precisa definir o horário"}</span>
              <span className="mt-1 block text-[11px] text-gray-500">{tournament.matchWindowMinutes > 0 ? `${tournament.matchWindowMinutes} minutos por confronto · ${tournament.graceMinutes} minutos de tolerância por time` : `${tournament.woAfterHours} horas para cada confronto`}</span>
            </span>
          </div>
          {countdown && untilStart! > 0 ? (
            <div className="flex items-center gap-1.5 font-mono text-white">
              {countdown.days > 0 && <span className="rounded-lg bg-black/30 px-2.5 py-2 text-sm font-black">{countdown.days}d</span>}
              <span className="rounded-lg bg-black/30 px-2.5 py-2 text-sm font-black">{String(countdown.hours).padStart(2, "0")}h</span>
              <span className="rounded-lg bg-black/30 px-2.5 py-2 text-sm font-black">{String(countdown.minutes).padStart(2, "0")}m</span>
              <span className="rounded-lg bg-black/30 px-2.5 py-2 text-sm font-black">{String(countdown.seconds).padStart(2, "0")}s</span>
            </div>
          ) : tournament.startsAt ? <StatusPill tone="live">Campeonato liberado</StatusPill> : <StatusPill tone="warn">Horário pendente</StatusPill>}
        </div>
        <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-gray-400">A chave pode ser publicada antes. O prazo de uma partida só começa após este horário e quando os dois times daquele confronto estiverem definidos.</p>
        {!tournament.startsAt && tournament.access.canManage && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
            <Input type="datetime-local" value={startWhen} onChange={(event) => setStartWhen(event.target.value)} className="h-9 w-60 border-white/10 bg-black/20 text-xs" />
            <Button size="sm" disabled={!startWhen || starting} onClick={() => void saveStart()} className="h-9 bg-blue-500 px-3 text-xs text-white hover:bg-blue-400">{starting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="mr-1.5 h-3.5 w-3.5" />}Definir início</Button>
          </div>
        )}
      </div>

      {nextMatch && (
        <button onClick={() => setSelectedMatch(nextMatch)} className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-left transition hover:border-emerald-400/55">
          <span><span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">Sua próxima partida está pronta</span><span className="mt-1 block text-sm font-black text-white">{nextMatch.homeTeam?.name} × {nextMatch.awayTeam?.name}</span>{nextMatchTiming && <span className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${nextMatchTiming.expired ? "text-red-400" : nextMatchTiming.waiting ? "text-blue-300" : "text-amber-300"}`}><CalendarClock className="h-3 w-3" />{nextMatchTiming.label}</span>}</span>
          <span className="flex flex-shrink-0 items-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-black text-black"><Play className="mr-1.5 h-4 w-4" />Abrir sala</span>
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Formato" value={FORMAT_LABELS[tournament.format]} icon={GitBranch} accent="text-amber-400" />
        <StatTile
          label="Times"
          value={`${tournament.teams.length}/${tournament.maxTeams}`}
          icon={Users}
          accent="text-emerald-400"
        />
        <StatTile
          label="Partidas"
          value={`${finishedMatches}/${tournament.matches.length}`}
          hint="encerradas"
          icon={ListOrdered}
          accent="text-blue-400"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] pb-px">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-bold transition ${
              tab === item.id
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-400">{item.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "bracket" && <BracketView tournament={tournament} onSelectMatch={setSelectedMatch} />}
      {tab === "standings" && <StandingsView tournament={tournament} />}
      {tab === "my-matches" && <MatchesView tournament={tournament} onSelectMatch={setSelectedMatch} onlyMine />}
      {tab === "matches" && <MatchesView tournament={tournament} onSelectMatch={setSelectedMatch} />}
      {tab === "teams" && <TeamsPanel tournament={tournament} onChanged={() => void load()} />}
      {tab === "ea-stats" && <EaStatsView tournamentId={tournament.id} finished={tournament.status === "FINISHED"} />}
      {tab === "proofs" && <ProofReviewPanel tournamentId={tournament.id} onReviewed={() => void load()} />}
      {tab === "staff" && <StaffPanel tournament={tournament} onChanged={() => void load()} />}

      {selectedMatch && canOpenRoom(selectedMatch) && (
        <MatchRoomDialog
          tournament={tournament}
          match={selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          onChanged={() => void load()}
          onOpenPhoto={() => {
            setPhotoMatch(selectedMatch)
            setSelectedMatch(null)
          }}
        />
      )}

      {photoMatch && (
        <ReportResultDialog
          open={canReport}
          onOpenChange={(open) => !open && setPhotoMatch(null)}
          homeName={photoMatch.homeTeam?.name ?? "Mandante"}
          awayName={photoMatch.awayTeam?.name ?? "Visitante"}
          homeLogo={photoMatch.homeTeam?.logoUrl}
          awayLogo={photoMatch.awayTeam?.logoUrl}
          requireProof={tournament.requireProof}
          canModerate={tournament.access.canModerate}
          onSubmit={async (input) => {
            const result = await reportResult(tournament.id, photoMatch.id, input)
            await load()
            setNotice(
              result.autoApproved
                ? "Resultado confirmado."
                : result.processing
                  ? "Foto recebida. A IA está conferindo o placar em segundo plano."
                : "Prova enviada. A organização vai revisar o placar.",
            )
            return { autoApproved: result.autoApproved }
          }}
          onWalkover={
            tournament.access.canModerate
              ? async ({ winner, reason }) => {
                  const winnerTeamId = winner === "HOME" ? photoMatch.homeTeamId : photoMatch.awayTeamId
                  if (!winnerTeamId) return
                  await declareWalkover(tournament.id, photoMatch.id, winnerTeamId, reason)
                  await load()
                  setNotice("W.O. registrado. A vaga seguiu para a fase seguinte.")
                }
              : undefined
          }
        />
      )}

    </div>
  )
}
