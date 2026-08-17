"use client"

import { Camera, CheckCircle2, Clock, Play } from "lucide-react"
import { StatusPill, TeamCrest, formatDateTime } from "@/components/competitions/shared"
import {
  MATCH_STATUS_LABELS,
  PHASE_LABELS,
  type TournamentDetail,
  type TournamentMatch,
  type TournamentMatchStatus,
} from "@/lib/services/tournaments.types"

const TONES: Record<TournamentMatchStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  PENDING: "neutral",
  READY: "live",
  AWAITING_PROOF: "warn",
  DISPUTED: "danger",
  FINISHED: "done",
  WALKOVER: "neutral",
}

const ICONS: Record<TournamentMatchStatus, typeof Clock> = {
  PENDING: Clock,
  READY: Play,
  AWAITING_PROOF: Camera,
  DISPUTED: Camera,
  FINISHED: CheckCircle2,
  WALKOVER: CheckCircle2,
}

export function MatchesView({
  tournament,
  onSelectMatch,
}: {
  tournament: TournamentDetail
  onSelectMatch: (match: TournamentMatch) => void
}) {
  if (tournament.matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
        As partidas são geradas quando o campeonato começa.
      </p>
    )
  }

  const byRound = new Map<string, TournamentMatch[]>()
  for (const match of tournament.matches) {
    const key = `${match.phase}|${match.round}|${match.groupId ?? ""}`
    byRound.set(key, [...(byRound.get(key) ?? []), match])
  }

  return (
    <div className="space-y-5">
      {[...byRound.entries()].map(([key, matches]) => {
        const [phase, round] = key.split("|")
        const heading =
          matches[0].label ?? `${PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}, rodada ${round}`

        return (
          <div key={key}>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">{heading}</h3>
            <div className="grid gap-2 lg:grid-cols-2">
              {matches.map((match) => {
                const Icon = ICONS[match.status]
                const isMine = tournament.access.teamIds.some(
                  (id) => id === match.homeTeamId || id === match.awayTeamId,
                )

                return (
                  <button
                    key={match.id}
                    onClick={() => onSelectMatch(match)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      isMine
                        ? "border-amber-500/30 bg-amber-500/[0.05] hover:border-amber-500/50"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <TeamCrest name={match.homeTeam?.name} logoUrl={match.homeTeam?.logoUrl} size={26} />
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] ${
                          match.winnerTeamId === match.homeTeamId
                            ? "font-bold text-emerald-300"
                            : "font-semibold text-gray-300"
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
                          match.winnerTeamId === match.awayTeamId
                            ? "font-bold text-emerald-300"
                            : "font-semibold text-gray-300"
                        }`}
                      >
                        {match.awayTeam?.name ?? "A definir"}
                      </span>
                      <TeamCrest name={match.awayTeam?.name} logoUrl={match.awayTeam?.logoUrl} size={26} />
                    </div>

                    <div className="hidden flex-shrink-0 sm:block">
                      <StatusPill tone={TONES[match.status]}>
                        <Icon className="h-3 w-3" />
                        {MATCH_STATUS_LABELS[match.status]}
                      </StatusPill>
                    </div>
                  </button>
                )
              })}
            </div>
            {matches.some((match) => match.scheduledAt) && (
              <p className="mt-1 text-[11px] text-gray-600">
                Agendada para {formatDateTime(matches.find((match) => match.scheduledAt)?.scheduledAt)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
