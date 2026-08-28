"use client"

import { useEffect, useState } from "react"
import { Camera, Clock, Crown } from "lucide-react"
import { StatusPill, TeamCrest, formatDateTime } from "@/components/competitions/shared"
import type { TournamentDetail, TournamentMatch, TournamentPhase } from "@/lib/services/tournaments.types"
import { matchTiming } from "@/lib/tournament-match-timing"

const KNOCKOUT_PHASES: TournamentPhase[] = ["WINNERS", "LOSERS", "GRAND_FINAL", "THIRD_PLACE"]

function MatchCard({
  match,
  onSelect,
  highlightTeamIds,
  tournament,
  now,
}: {
  match: TournamentMatch
  onSelect: (match: TournamentMatch) => void
  highlightTeamIds: string[]
  tournament: TournamentDetail
  now: number
}) {
  const finished = match.status === "FINISHED" || match.status === "WALKOVER"
  const isMine = highlightTeamIds.some((id) => id === match.homeTeamId || id === match.awayTeamId)
  const awaiting = match.status === "AWAITING_PROOF"
  const timing = matchTiming(match, tournament, now)

  const side = (team: typeof match.homeTeam, score: number | null, isWinner: boolean) => (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 ${
        finished && isWinner ? "bg-emerald-500/[0.07]" : ""
      }`}
    >
      <TeamCrest name={team?.name} logoUrl={team?.logoUrl} size={22} />
      <span
        className={`min-w-0 flex-1 truncate text-[12px] ${
          team ? (finished && isWinner ? "font-bold text-emerald-300" : "font-semibold text-gray-200") : "italic text-gray-600"
        }`}
      >
        {team?.name ?? "A definir"}
      </span>
      <span
        className={`w-6 text-right text-[13px] font-black tabular-nums ${
          finished && isWinner ? "text-emerald-300" : "text-gray-400"
        }`}
      >
        {score ?? "-"}
      </span>
    </div>
  )

  return (
    <button
      onClick={() => onSelect(match)}
      className={`w-full min-w-[200px] cursor-pointer overflow-hidden rounded-lg border text-left transition ${
        isMine
          ? "border-amber-500/35 bg-amber-500/[0.05] hover:border-amber-500/60"
          : "border-white/[0.08] bg-white/[0.025] hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-2.5 py-1">
        <span className="truncate text-[9px] font-bold uppercase tracking-wider text-gray-600">
          {match.label ?? `Rodada ${match.round}`}
        </span>
        {awaiting && <Camera className="h-3 w-3 flex-shrink-0 text-amber-400" />}
        {match.status === "READY" && match.scheduledAt && <Clock className="h-3 w-3 flex-shrink-0 text-gray-600" />}
      </div>
      {side(match.homeTeam, match.homeScore, match.winnerTeamId === match.homeTeamId)}
      <div className="h-px bg-white/[0.05]" />
      {side(match.awayTeam, match.awayScore, match.winnerTeamId === match.awayTeamId)}
      {timing && (
        <div className={`flex items-center justify-between gap-2 border-t px-2.5 py-1.5 text-[9px] font-bold ${timing.expired ? "border-red-500/15 text-red-400" : timing.waiting ? "border-blue-500/15 text-blue-300" : "border-amber-500/15 text-amber-300"}`}>
          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{timing.label}</span>
          {(match.homeGraceUsed || match.awayGraceUsed) && <span>+{(Number(match.homeGraceUsed) + Number(match.awayGraceUsed)) * tournament.graceMinutes}m</span>}
        </div>
      )}
    </button>
  )
}

function BracketColumns({
  matches,
  onSelect,
  highlightTeamIds,
  tournament,
  now,
}: {
  matches: TournamentMatch[]
  onSelect: (match: TournamentMatch) => void
  highlightTeamIds: string[]
  tournament: TournamentDetail
  now: number
}) {
  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b)

  return (
    <div className="flex min-w-max gap-5 pb-2">
      {rounds.map((round) => {
        const roundMatches = matches
          .filter((match) => match.round === round)
          .sort((a, b) => a.position - b.position)

        return (
          <div key={round} className="flex min-w-[200px] flex-col">
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
              {roundMatches[0]?.label?.split("·").pop()?.trim() ?? `Rodada ${round}`}
            </p>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {roundMatches.map((match) => (
                <MatchCard key={match.id} match={match} onSelect={onSelect} highlightTeamIds={highlightTeamIds} tournament={tournament} now={now} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-gray-600">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export function BracketView({
  tournament,
  onSelectMatch,
}: {
  tournament: TournamentDetail
  onSelectMatch: (match: TournamentMatch) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const knockout = tournament.matches.filter((match) => KNOCKOUT_PHASES.includes(match.phase))
  if (knockout.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
        Este formato não tem chave de mata-mata. Acompanhe pela tabela de classificação.
      </p>
    )
  }

  const winners = knockout.filter((match) => match.phase === "WINNERS")
  const losers = knockout.filter((match) => match.phase === "LOSERS")
  const grandFinal = knockout.filter((match) => match.phase === "GRAND_FINAL")
  const thirdPlace = knockout.filter((match) => match.phase === "THIRD_PLACE")
  const champion = tournament.teams.find((team) => team.id === tournament.championTeamId)
  const highlightTeamIds = tournament.access.teamIds

  return (
    <div className="space-y-8">
      {champion && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.12] to-transparent p-4">
          <Crown className="h-7 w-7 flex-shrink-0 text-amber-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Campeão</p>
            <p className="truncate text-lg font-black text-white">{champion.name}</p>
          </div>
          <div className="ml-auto text-right">
            <StatusPill tone="done">Encerrado em {formatDateTime(tournament.finishedAt)}</StatusPill>
          </div>
        </div>
      )}

      {winners.length > 0 && (
        <Section
          title={losers.length > 0 ? "Chave dos vencedores" : "Chave principal"}
          subtitle="Toque em uma partida para lançar ou revisar o resultado"
        >
          <BracketColumns matches={winners} onSelect={onSelectMatch} highlightTeamIds={highlightTeamIds} tournament={tournament} now={now} />
        </Section>
      )}

      {losers.length > 0 && (
        <Section title="Chave dos perdedores" subtitle="Quem cai na chave de cima ainda pode voltar por aqui">
          <BracketColumns matches={losers} onSelect={onSelectMatch} highlightTeamIds={highlightTeamIds} tournament={tournament} now={now} />
        </Section>
      )}

      {grandFinal.length > 0 && (
        <Section title="Grande final">
          <BracketColumns matches={grandFinal} onSelect={onSelectMatch} highlightTeamIds={highlightTeamIds} tournament={tournament} now={now} />
        </Section>
      )}

      {thirdPlace.length > 0 && (
        <Section title="Disputa de 3º lugar">
          <BracketColumns matches={thirdPlace} onSelect={onSelectMatch} highlightTeamIds={highlightTeamIds} tournament={tournament} now={now} />
        </Section>
      )}
    </div>
  )
}
