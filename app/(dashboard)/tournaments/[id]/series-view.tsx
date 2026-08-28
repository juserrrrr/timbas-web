"use client"

import { useEffect, useState } from "react"
import { Camera, Clock, Crown, Swords } from "lucide-react"
import { StatusPill, TeamCrest, formatDateTime } from "@/components/competitions/shared"
import { formatLabel, type TournamentDetail, type TournamentMatch } from "@/lib/services/tournaments.types"
import { matchTiming } from "@/lib/tournament-match-timing"

function SeriesSide({
  team,
  wins,
  leading,
}: {
  team: { name: string; logoUrl: string | null } | undefined
  wins: number
  leading: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <TeamCrest name={team?.name} logoUrl={team?.logoUrl} size={54} />
      <span className="min-w-0 truncate text-sm font-black text-white">{team?.name ?? "A definir"}</span>
      <span className={`text-4xl font-black tabular-nums ${leading ? "text-emerald-300" : "text-gray-400"}`}>
        {wins}
      </span>
    </div>
  )
}

function GameRow({
  match,
  tournament,
  now,
  onSelect,
}: {
  match: TournamentMatch
  tournament: TournamentDetail
  now: number
  onSelect: (match: TournamentMatch) => void
}) {
  const finished = match.status === "FINISHED" || match.status === "WALKOVER"
  const isMine = tournament.access.teamIds.some((id) => id === match.homeTeamId || id === match.awayTeamId)
  const timing = matchTiming(match, tournament, now)

  return (
    <button
      onClick={() => onSelect(match)}
      className={`w-full cursor-pointer overflow-hidden rounded-xl border text-left transition ${
        isMine
          ? "border-amber-500/30 bg-amber-500/[0.05] hover:border-amber-500/55"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1.5">
        <span className="truncate text-[10px] font-black uppercase tracking-wider text-gray-500">
          {match.label ?? `Jogo ${match.round}`}
        </span>
        {match.status === "AWAITING_PROOF" && <Camera className="h-3 w-3 flex-shrink-0 text-amber-400" />}
        {!finished && match.status !== "AWAITING_PROOF" && <StatusPill tone="live">Em aberto</StatusPill>}
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamCrest name={match.homeTeam?.name} logoUrl={match.homeTeam?.logoUrl} size={26} />
          <span
            className={`min-w-0 flex-1 truncate text-[13px] ${
              match.winnerTeamId === match.homeTeamId ? "font-bold text-emerald-300" : "font-semibold text-gray-300"
            }`}
          >
            {match.homeTeam?.name ?? "A definir"}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-black/40 px-2.5 py-1">
          <span className="text-base font-black tabular-nums text-white">{match.homeScore ?? "-"}</span>
          <span className="text-[11px] text-gray-600">×</span>
          <span className="text-base font-black tabular-nums text-white">{match.awayScore ?? "-"}</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-right text-[13px] ${
              match.winnerTeamId === match.awayTeamId ? "font-bold text-emerald-300" : "font-semibold text-gray-300"
            }`}
          >
            {match.awayTeam?.name ?? "A definir"}
          </span>
          <TeamCrest name={match.awayTeam?.name} logoUrl={match.awayTeam?.logoUrl} size={26} />
        </div>
      </div>

      {timing && (
        <div
          className={`flex items-center gap-1 border-t px-3 py-1.5 text-[10px] font-bold ${
            timing.expired
              ? "border-red-500/15 text-red-400"
              : timing.waiting
                ? "border-blue-500/15 text-blue-300"
                : "border-amber-500/15 text-amber-300"
          }`}
        >
          <Clock className="h-3 w-3" />
          {timing.label}
        </div>
      )}
    </button>
  )
}

export function SeriesView({
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

  const games = tournament.matches
    .filter((match) => match.phase === "SERIES")
    .sort((a, b) => a.round - b.round)

  if (games.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
        O primeiro jogo da série aparece quando o campeonato começar.
      </p>
    )
  }

  // Os times vêm da inscrição, não do jogo: o mando alterna a cada jogo e o
  // placar da série precisa ficar sempre do mesmo lado.
  const [first, second] = [...tournament.teams].sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
  const winsOf = (teamId: string | undefined) =>
    teamId ? games.filter((game) => game.winnerTeamId === teamId).length : 0
  const needed = Math.floor(tournament.bestOf / 2) + 1
  const champion = tournament.teams.find((team) => team.id === tournament.championTeamId)
  const pending = tournament.bestOf - games.length

  const firstWins = winsOf(first?.id)
  const secondWins = winsOf(second?.id)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-5">
        <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
          <Swords className="h-3.5 w-3.5" />
          {formatLabel(tournament)}
        </div>
        <div className="flex items-center gap-4">
          <SeriesSide team={first} wins={firstWins} leading={firstWins > secondWins} />
          <span className="flex-shrink-0 text-xs font-black uppercase tracking-wider text-gray-600">vitórias</span>
          <SeriesSide team={second} wins={secondWins} leading={secondWins > firstWins} />
        </div>
        <p className="mt-4 border-t border-white/[0.06] pt-3 text-center text-[11px] text-gray-500">
          {champion
            ? `Série encerrada. ${champion.name} venceu.`
            : `Vence quem chegar a ${needed} ${needed === 1 ? "vitória" : "vitórias"}. ${
                pending > 0
                  ? `Ainda cabem até ${pending} ${pending === 1 ? "jogo" : "jogos"}.`
                  : "Este é o último jogo da série."
              }`}
        </p>
      </div>

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

      <div className="space-y-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Jogos</h3>
        <p className="text-[11px] text-gray-600">Toque em um jogo para lançar ou revisar o resultado.</p>
        <div className="grid gap-2 pt-1 lg:grid-cols-2">
          {games.map((match) => (
            <GameRow key={match.id} match={match} tournament={tournament} now={now} onSelect={onSelectMatch} />
          ))}
        </div>
      </div>
    </div>
  )
}
