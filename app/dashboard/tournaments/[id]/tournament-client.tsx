"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Camera,
  Coins,
  GitBranch,
  ListOrdered,
  Loader2,
  Play,
  ShieldCheck,
  Swords,
  Table2,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CompetitionHeader,
  ErrorState,
  PageLoading,
  StatTile,
  StatusPill,
} from "@/components/competitions/shared"
import { ReportResultDialog } from "@/components/competitions/report-result-dialog"
import { declareWalkover, getTournament, reportResult, startTournament } from "@/lib/services/tournaments"
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

const STATUS_TONES: Record<TournamentStatus, "neutral" | "live" | "warn" | "done" | "danger"> = {
  DRAFT: "neutral",
  REGISTRATION: "warn",
  RUNNING: "live",
  FINISHED: "done",
  CANCELLED: "danger",
}

type TabId = "bracket" | "standings" | "matches" | "teams" | "proofs" | "staff"

export function TournamentClient({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<TabId>("bracket")
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null)
  const [photoMatch, setPhotoMatch] = useState<TournamentMatch | null>(null)
  const [starting, setStarting] = useState(false)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      setTournament(await getTournament(tournamentId))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o campeonato")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    void load()
  }, [load])

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
      { id: "matches" as const, label: "Partidas", icon: Swords },
      { id: "teams" as const, label: "Times", icon: Users },
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
            <StatusPill tone={STATUS_TONES[tournament.status]}>{STATUS_LABELS[tournament.status]}</StatusPill>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatTile
          label="Prêmio do campeão"
          value={tournament.coinsChampion.toLocaleString("pt-BR")}
          hint="moedas"
          icon={Coins}
          accent="text-amber-400"
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
      {tab === "matches" && <MatchesView tournament={tournament} onSelectMatch={setSelectedMatch} />}
      {tab === "teams" && <TeamsPanel tournament={tournament} onChanged={() => void load()} />}
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
                ? "Resultado confirmado e moedas creditadas."
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
