"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, Camera, CheckCircle2, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState, StatusPill, TeamCrest, formatDateTime } from "@/components/competitions/shared"
import { ReportResultDialog } from "@/components/competitions/report-result-dialog"
import { listDraftMatches, reportDraftResult } from "@/lib/services/draft"
import type { DraftLeagueDetail, DraftMatch } from "@/lib/services/draft.types"

export function FixturesPanel({ league, onChanged }: { league: DraftLeagueDetail; onChanged: () => void }) {
  const [matches, setMatches] = useState<DraftMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DraftMatch | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      setMatches(await listDraftMatches(league.id))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as rodadas")
    } finally {
      setLoading(false)
    }
  }, [league.id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhuma rodada agendada"
        description={`As rodadas são criadas automaticamente quando o draft termina, sempre nos dias configurados pela liga.`}
      />
    )
  }

  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b)
  const myUserId = league.rosters.find((roster) => roster.id === league.access.rosterId)?.userId

  const canReport = (match: DraftMatch) =>
    match.status !== "FINISHED" &&
    (league.access.canModerate || match.homeRoster.userId === myUserId || match.awayRoster.userId === myUserId)

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}
      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}

      {rounds.map((round) => {
        const roundMatches = matches.filter((match) => match.round === round)
        const isCurrent = round === league.currentRound

        return (
          <div key={round}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Rodada {round}</h3>
              {isCurrent && <StatusPill tone="live">Rodada atual</StatusPill>}
              <span className="text-[11px] text-gray-600">{formatDateTime(roundMatches[0]?.scheduledAt)}</span>
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              {roundMatches.map((match) => {
                const finished = match.status === "FINISHED"
                const awaiting = match.status === "AWAITING_PROOF"

                return (
                  <button
                    key={match.id}
                    onClick={() => canReport(match) && setSelected(match)}
                    disabled={!canReport(match)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      canReport(match)
                        ? "cursor-pointer border-emerald-500/25 bg-emerald-500/[0.04] hover:border-emerald-500/50"
                        : "border-white/[0.07] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <TeamCrest name={match.homeRoster.name} logoUrl={match.homeRoster.logoUrl} size={26} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-300">
                        {match.homeRoster.name}
                      </span>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-black/40 px-2.5 py-1">
                      <span className="text-base font-black tabular-nums text-white">{match.homeScore ?? "-"}</span>
                      <span className="text-[11px] text-gray-600">×</span>
                      <span className="text-base font-black tabular-nums text-white">{match.awayScore ?? "-"}</span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span className="min-w-0 flex-1 truncate text-right text-[13px] font-semibold text-gray-300">
                        {match.awayRoster.name}
                      </span>
                      <TeamCrest name={match.awayRoster.name} logoUrl={match.awayRoster.logoUrl} size={26} />
                    </div>

                    <div className="hidden flex-shrink-0 sm:block">
                      {finished ? (
                        <StatusPill tone="done">
                          <CheckCircle2 className="h-3 w-3" />
                          Encerrada
                        </StatusPill>
                      ) : awaiting ? (
                        <StatusPill tone="warn">
                          <Camera className="h-3 w-3" />
                          Validando
                        </StatusPill>
                      ) : (
                        <StatusPill tone="neutral">Agendada</StatusPill>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {selected && (
        <ReportResultDialog
          open
          onOpenChange={(open) => !open && setSelected(null)}
          homeName={selected.homeRoster.name}
          awayName={selected.awayRoster.name}
          homeLogo={selected.homeRoster.logoUrl}
          awayLogo={selected.awayRoster.logoUrl}
          requireProof
          canModerate={league.access.canModerate}
          squads={{
            home: {
              name: selected.homeRoster.name,
              players: league.rosters.find((roster) => roster.id === selected.homeRosterId)?.players ?? [],
            },
            away: {
              name: selected.awayRoster.name,
              players: league.rosters.find((roster) => roster.id === selected.awayRosterId)?.players ?? [],
            },
          }}
          onSubmit={async (input) => {
            const result = await reportDraftResult(league.id, selected.id, input)
            await load()
            onChanged()
            setNotice(
              result.autoApproved
                ? "Resultado confirmado e tabela atualizada."
                : "Prova enviada. A organização vai revisar o placar.",
            )
            return { autoApproved: result.autoApproved }
          }}
        />
      )}
    </div>
  )
}
