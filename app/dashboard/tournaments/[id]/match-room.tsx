"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarClock, Camera, Check, Clock, DatabaseZap, Loader2, RefreshCw, Send, TriangleAlert, UserX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { StatusPill, TeamCrest, formatDateTime } from "@/components/competitions/shared"
import {
  claimMatchResult,
  checkTournamentEaResult,
  correctLabTournamentResult,
  discardInterruptedLabEaResult,
  getMatchRoom,
  postMatchMessage,
  proposeMatchSchedule,
  respondMatchClaim,
  respondMatchSchedule,
  requestTournamentMatchReview,
  requestMatchGrace,
  rescanClosedLabEaResult,
  setTournamentMatchReady,
  type EaMatchChoice,
  type LabEaRescanResult,
  type MatchRoom,
} from "@/lib/services/tournaments"
import type { TournamentDetail, TournamentMatch } from "@/lib/services/tournaments.types"
import { brasiliaInputValue, brasiliaLocalToIso } from "@/lib/date-time"

const POLL_MS = 8000

/// Conta o tempo que falta para o prazo de W.O. estourar.
function remainingLabel(deadlineAt: string | null): string | null {
  if (!deadlineAt) return null
  const diff = new Date(deadlineAt).getTime() - Date.now()
  if (diff <= 0) return "prazo estourado"
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${minutes}min para o prazo` : `${minutes}min para o prazo`
}

function localInputValue(date: Date): string {
  return brasiliaInputValue(date)
}

export function MatchRoomDialog({
  tournament,
  match,
  onOpenChange,
  onChanged,
  onOpenPhoto,
}: {
  tournament: TournamentDetail
  match: TournamentMatch
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  onOpenPhoto: () => void
}) {
  const [room, setRoom] = useState<MatchRoom | null>(null)
  const [body, setBody] = useState("")
  const [when, setWhen] = useState(() => localInputValue(new Date(Date.now() + 24 * 3_600_000)))
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [reviewReason, setReviewReason] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [eaChoices, setEaChoices] = useState<EaMatchChoice[]>([])
  const [eaRescan, setEaRescan] = useState<LabEaRescanResult | null>(null)

  const load = useCallback(async () => {
    try {
      setRoom(await getMatchRoom(tournament.id, match.id))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir a sala da partida.")
    }
  }, [tournament.id, match.id])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setError("")
    try {
      await action()
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  const checkEa = async (eaMatchId?: string) => {
    setBusy("ea")
    setError("")
    if (!eaMatchId) setEaChoices([])
    try {
      const result = await checkTournamentEaResult(tournament.id, match.id, eaMatchId)
      if ("selectionRequired" in result) {
        setEaChoices(result.candidates)
        return
      }
      setEaChoices([])
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível consultar a EA.")
    } finally {
      setBusy("")
    }
  }

  const rescanClosedEa = async () => {
    setBusy("ea-rescan")
    setError("")
    try {
      setEaRescan(await rescanClosedLabEaResult(tournament.id, match.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reanalisar a partida na EA.")
    } finally {
      setBusy("")
    }
  }

  const applyEaRescan = async () => {
    if (!eaRescan || eaRescan.kind === "CONSISTENT") return
    await run("ea-rescan-apply", async () => {
      if (eaRescan.kind === "INTERRUPTED") {
        await discardInterruptedLabEaResult(tournament.id, match.id)
      } else {
        await correctLabTournamentResult(tournament.id, match.id, eaRescan.inferredHomeScore, eaRescan.inferredAwayScore)
      }
      setEaRescan(null)
    })
  }

  const home = match.homeTeam?.name ?? "Mandante"
  const away = match.awayTeam?.name ?? "Visitante"
  const closed = match.status === "FINISHED" || match.status === "WALKOVER"

  const mySide = room?.mySide ?? null
  const myTeamId = mySide === "HOME" ? match.homeTeamId : mySide === "AWAY" ? match.awayTeamId : null
  const proposal = room?.match.scheduleProposedAt ?? null
  const proposalIsMine = room?.match.scheduleProposedByTeamId === myTeamId
  const claimed = room?.match.claimedHomeScore !== null && room?.match.claimedHomeScore !== undefined
  const claimIsMine = room?.match.claimedByTeamId === myTeamId
  const remaining = remainingLabel(room?.deadlineAt ?? null)
  const quickMode = (room?.matchWindowMinutes ?? tournament.matchWindowMinutes) > 0
  const graceUsed = mySide === "HOME" ? room?.match.homeGraceUsed : mySide === "AWAY" ? room?.match.awayGraceUsed : false
  const homeReady = Boolean(room?.match.homeReadyAt)
  const awayReady = Boolean(room?.match.awayReadyAt)
  const bothReady = homeReady && awayReady
  const myReady = mySide === "HOME" ? homeReady : mySide === "AWAY" ? awayReady : false
  const checkInBeginsAt = Math.max(
    room?.match.readyAt ? new Date(room.match.readyAt).getTime() : 0,
    tournament.startsAt ? new Date(tournament.startsAt).getTime() : 0,
  )
  const checkInOpen = checkInBeginsAt > 0 && Date.now() >= checkInBeginsAt
  const checkInExpired = Boolean(room?.deadlineAt && Date.now() >= new Date(room.deadlineAt).getTime())
  const eaPlayerStats = room?.match.eaPlayerStats ?? match.eaPlayerStats ?? []

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0b12]">
        <DialogHeader>
          <DialogTitle className="text-white">Sala da partida</DialogTitle>
          <DialogDescription>
            {match.label ?? `Rodada ${match.round}`}. Combinem o horário aqui, joguem no jogo e depois lancem o
            placar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <TeamCrest name={match.homeTeam?.name} logoUrl={match.homeTeam?.logoUrl} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{home}</span>
            <span className="flex-shrink-0 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-black text-white">
              {match.homeScore ?? "-"} × {match.awayScore ?? "-"}
            </span>
            <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-white">{away}</span>
            <TeamCrest name={match.awayTeam?.name} logoUrl={match.awayTeam?.logoUrl} size={32} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {match.scheduledAt && (
              <StatusPill tone="live">
                <CalendarClock className="h-3 w-3" />
                Marcada para {formatDateTime(match.scheduledAt)}
              </StatusPill>
            )}
            {remaining && !closed && (
              <StatusPill tone={remaining === "prazo estourado" ? "danger" : "warn"}>
                <Clock className="h-3 w-3" />
                {remaining}
              </StatusPill>
            )}
            {mySide && <StatusPill tone="neutral">Você joga por {mySide === "HOME" ? home : away}</StatusPill>}
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11px] text-red-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          {!closed && mySide && !quickMode && (
            <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Horário de Brasília (BRT)</h3>

              {proposal ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] text-gray-300">
                    {proposalIsMine ? "Você propôs" : "O adversário propôs"} {formatDateTime(proposal)}
                  </span>
                  {!proposalIsMine && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        disabled={busy !== ""}
                        onClick={() => void run("schedule", () => respondMatchSchedule(tournament.id, match.id, true))}
                        className="h-7 bg-emerald-500 px-2 text-[11px] text-black hover:bg-emerald-400"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== ""}
                        onClick={() => void run("schedule", () => respondMatchSchedule(tournament.id, match.id, false))}
                        className="h-7 px-2 text-[11px]"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Recusar
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    type="datetime-local"
                    value={when}
                    onChange={(event) => setWhen(event.target.value)}
                    className="h-9 w-56 border-white/10 bg-white/[0.03] text-[12px]"
                  />
                  <Button
                    size="sm"
                    disabled={busy !== "" || !when}
                    onClick={() =>
                      void run("schedule", () =>
                        proposeMatchSchedule(tournament.id, match.id, brasiliaLocalToIso(when)),
                      )
                    }
                    className="h-9 bg-blue-500 px-3 text-[12px] text-white hover:bg-blue-400"
                  >
                    Propor horário
                  </Button>
                </div>
              )}
            </div>
          )}

          {!closed && quickMode && room && (
            <div className={`space-y-3 rounded-xl border p-3 ${bothReady ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-amber-500/20 bg-amber-500/[0.05]"}`}>
              <div>
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] ${bothReady ? "text-emerald-300" : "text-amber-300"}`}>
                  {bothReady ? "Partida liberada" : "Check-in da partida"}
                </h3>
                <p className="mt-1 text-[11px] text-gray-400">
                  {bothReady
                    ? "Os dois times confirmaram presença. Agora joguem o amistoso e sincronizem o resultado pela EA."
                    : !checkInOpen
                      ? "O check-in abre quando este confronto começar."
                      : `Cada time precisa marcar Pronto antes do prazo. Quem não confirmar perde por W.O. Cada lado pode pedir +${room.graceMinutes} minutos uma vez.`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg border px-3 py-2 text-center text-[11px] font-bold ${homeReady ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-white/[0.07] bg-black/20 text-gray-500"}`}>
                  {home}: {homeReady ? "Pronto" : "Pendente"}
                </div>
                <div className={`rounded-lg border px-3 py-2 text-center text-[11px] font-bold ${awayReady ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-white/[0.07] bg-black/20 text-gray-500"}`}>
                  {away}: {awayReady ? "Pronto" : "Pendente"}
                </div>
              </div>

              {mySide && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy !== "" || bothReady || !checkInOpen || checkInExpired}
                    onClick={() => void run("ready", () => setTournamentMatchReady(tournament.id, match.id, !myReady))}
                    className={myReady ? "h-9 border border-white/10 bg-white/[0.06] px-3 text-[11px] text-gray-300 hover:bg-white/[0.1]" : "h-9 bg-emerald-500 px-3 text-[11px] font-bold text-black hover:bg-emerald-400"}
                  >
                    {busy === "ready" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                    {bothReady ? "Os dois estão prontos" : myReady ? "Desmarcar pronto" : "Pronto para jogar"}
                  </Button>
                  {!bothReady && (
                    <Button size="sm" variant="outline" disabled={busy !== "" || graceUsed || room.graceMinutes <= 0 || !checkInOpen || checkInExpired} onClick={() => void run("grace", () => requestMatchGrace(tournament.id, match.id))} className="h-9 border-amber-500/25 px-3 text-[11px] text-amber-300 hover:bg-amber-500/10">
                      {busy === "grace" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Clock className="mr-1.5 h-3.5 w-3.5" />}
                      {graceUsed ? "Tolerância já usada" : `Pedir +${room.graceMinutes} min`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {!closed && room?.resultMode === "EA_API" && (mySide || room?.canModerate) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/15 bg-blue-500/[0.05] p-2.5">
              <p className="text-[11px] text-blue-200">
                Terminou o amistoso? Busque placar e estatísticas dos jogadores direto na EA.
              </p>
              <Button
                size="sm"
                disabled={busy !== "" || (quickMode ? !bothReady : !match.scheduledAt)}
                onClick={() => void checkEa()}
                className="h-8 bg-blue-500 px-3 text-[11px] text-white hover:bg-blue-400"
              >
                {busy === "ea" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <DatabaseZap className="mr-1.5 h-3.5 w-3.5" />}
                Checar na EA
              </Button>
            </div>
          )}

          {!closed && eaChoices.length > 0 && (mySide || room?.canModerate) && (
            <div className="space-y-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.045] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-cyan-200">Confirme qual amistoso pertence a este confronto</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">Confira data e placar antes de confirmar. Se o resultado correto ainda não apareceu, faça uma nova busca.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy !== ""}
                  onClick={() => void checkEa()}
                  className="h-8 border-cyan-500/25 px-3 text-[10px] text-cyan-300 hover:bg-cyan-500/10"
                >
                  {busy === "ea" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  Rescanear na EA
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {eaChoices.map((candidate, index) => (
                  <div key={candidate.eaMatchId} className={`rounded-lg border ${candidate.suspiciousScore ? "border-red-500/30 bg-red-500/[0.06]" : "border-cyan-500/20"}`}>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy !== "" || Boolean(candidate.suspiciousScore && !room?.canModerate)}
                      onClick={() => void checkEa(candidate.eaMatchId)}
                      className="h-auto w-full justify-between px-3 py-2 text-left hover:bg-cyan-500/10"
                    >
                      <span className="min-w-0">
                        <span className={`block text-[10px] font-bold ${candidate.suspiciousScore ? "text-red-300" : "text-cyan-300"}`}>{candidate.suspiciousScore ? "Revisão obrigatória" : index === 0 ? "Mais antiga" : `Opção ${index + 1}`}</span>
                        <span className="block text-[10px] text-gray-500">{formatDateTime(candidate.playedAt)}</span>
                        <span className="block font-mono text-[9px] text-gray-600">EA #{candidate.eaMatchId}</span>
                      </span>
                      <span className="ml-3 text-right">
                        <span className="block text-sm font-black text-white">{candidate.homeScore} × {candidate.awayScore}</span>
                        {candidate.suspiciousScore && candidate.officialHomeScore !== undefined && candidate.officialAwayScore !== undefined &&
                          (candidate.homeScore !== candidate.officialHomeScore || candidate.awayScore !== candidate.officialAwayScore) && (
                            <span className="block text-[9px] text-gray-500 line-through">EA {candidate.officialHomeScore} × {candidate.officialAwayScore}</span>
                          )}
                      </span>
                    </Button>
                    {candidate.warning && <p className="border-t border-red-500/15 px-3 py-2 text-[9px] leading-relaxed text-red-300">{candidate.warning} {room?.canModerate ? "Confira e confirme para usar o SCORE dos atletas." : "Peça revisão da organização ou envie a imagem final."}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {closed && tournament.labMode && match.phase === "GROUP" && room?.canModerate && (
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.045] p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-amber-200">O placar foi lançado errado?</p>
                  <p className="mt-0.5 text-[10px] text-gray-600">Corrija manualmente ou consulte novamente o mesmo EA Match ID.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy !== ""} onClick={() => void rescanClosedEa()} className="h-8 border-cyan-500/25 px-3 text-[11px] text-cyan-300 hover:bg-cyan-500/10">
                    {busy === "ea-rescan" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <DatabaseZap className="mr-1.5 h-3.5 w-3.5" />}
                    Reanalisar na EA
                  </Button>
                  <Button size="sm" variant="outline" onClick={onOpenPhoto} className="h-8 border-amber-500/25 px-3 text-[11px] text-amber-300 hover:bg-amber-500/10">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Corrigir resultado
                  </Button>
                </div>
              </div>
              {eaRescan && (
                <div className={`rounded-md border p-2 text-[10px] ${eaRescan.kind === "CONSISTENT" ? "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300" : "border-red-500/20 bg-red-500/[0.05] text-red-300"}`}>
                  <p className="font-bold">EA: {eaRescan.officialHomeScore} × {eaRescan.officialAwayScore} · SCORE: {eaRescan.inferredHomeScore} × {eaRescan.inferredAwayScore}</p>
                  <p className="mt-1 text-gray-500">Duração detectada: {eaRescan.durationSeconds}s · userResult anormal: {eaRescan.nonZeroUserResults}/{eaRescan.playerCount}</p>
                  {eaRescan.kind === "CONSISTENT" ? <p className="mt-1">O cabeçalho e o SCORE dos atletas estão consistentes.</p> : (
                    <Button size="sm" disabled={busy !== ""} onClick={() => void applyEaRescan()} className="mt-2 h-7 bg-emerald-500 px-2 text-[10px] font-bold text-black hover:bg-emerald-400">
                      {busy === "ea-rescan-apply" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      {eaRescan.kind === "INTERRUPTED" ? "Descartar e reabrir" : `Aplicar SCORE ${eaRescan.inferredHomeScore} × ${eaRescan.inferredAwayScore}`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {!closed && tournament.labMode && room?.canModerate && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.045] p-2.5">
              <div>
                <p className="text-[11px] font-bold text-red-200">Um dos clubes não disputou a partida?</p>
                <p className="mt-0.5 text-[10px] text-gray-600">O W.O. é aplicado somente pelo admin, sem prazo automático.</p>
              </div>
              <Button size="sm" variant="outline" onClick={onOpenPhoto} className="h-8 border-red-500/25 px-3 text-[11px] text-red-300 hover:bg-red-500/10">
                <UserX className="mr-1.5 h-3.5 w-3.5" />
                Aplicar W.O. manual
              </Button>
            </div>
          )}

          {!closed && mySide && room?.resultMode === "AI_IMAGE" && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-3">
              <div><h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-300">Resultado por IA</h3><p className="mt-1 text-[11px] text-gray-500">Envie a tela final da partida. O placar será lido e validado pela IA.</p></div>
              <Button size="sm" variant="outline" onClick={onOpenPhoto} className="h-9 border-violet-500/25 px-3 text-[12px] text-violet-300 hover:bg-violet-500/10"><Camera className="mr-1.5 h-3.5 w-3.5" />Enviar imagem</Button>
            </div>
          )}

          {!closed && mySide && room?.resultMode === "MANUAL" && (
            <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Resultado</h3>

              {claimed ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-gray-300">
                    Placar informado: <span className="font-black text-white">
                      {room?.match.claimedHomeScore} × {room?.match.claimedAwayScore}
                    </span>
                    {claimIsMine ? " por você, aguardando o adversário." : " pelo adversário."}
                  </p>
                  {!claimIsMine && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        disabled={busy !== ""}
                        onClick={() => void run("claim", () => respondMatchClaim(tournament.id, match.id, true))}
                        className="h-7 bg-emerald-500 px-2 text-[11px] text-black hover:bg-emerald-400"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== ""}
                        onClick={() => void run("claim", () => respondMatchClaim(tournament.id, match.id, false))}
                        className="h-7 border-red-500/25 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                      >
                        Contestar
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      inputMode="numeric"
                      value={homeScore}
                      onChange={(event) => setHomeScore(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                      placeholder={home}
                      aria-label={`Gols de ${home}`}
                      className="h-9 w-16 border-white/10 bg-black/40 text-center text-[13px] font-bold"
                    />
                    <span className="pb-2 text-gray-600">×</span>
                    <Input
                      inputMode="numeric"
                      value={awayScore}
                      onChange={(event) => setAwayScore(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                      placeholder={away}
                      aria-label={`Gols de ${away}`}
                      className="h-9 w-16 border-white/10 bg-black/40 text-center text-[13px] font-bold"
                    />
                    <Button
                      size="sm"
                      disabled={busy !== "" || homeScore === "" || awayScore === ""}
                      onClick={() =>
                        void run("claim", () =>
                          claimMatchResult(tournament.id, match.id, Number(homeScore), Number(awayScore)),
                        )
                      }
                      className="h-9 bg-amber-500 px-3 text-[12px] text-black hover:bg-amber-400"
                    >
                      Informar placar
                    </Button>
                  </div>
                  <p className="text-[11px] leading-snug text-gray-600">
                    {room?.requireOpponentConfirm
                      ? "O adversário confirma antes de contar. Se ele não responder até o prazo, a partida vira W.O. para você."
                      : "Neste campeonato o placar informado conta na hora."}
                  </p>
                </>
              )}
            </div>
          )}

          {eaPlayerStats.length > 0 && (
            <div className="space-y-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.035] p-3">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-400">Dados oficiais da EA</h3>
                <p className="mt-1 text-[10px] text-gray-600">Partida e desempenho dos jogadores sincronizados do Clubs.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {([match.homeTeamId, match.awayTeamId] as const).map((teamId) => {
                  const team = teamId === match.homeTeamId ? match.homeTeam : match.awayTeam
                  const players = eaPlayerStats.filter((player) => player.teamId === teamId)
                  const teamScore = teamId === match.homeTeamId
                    ? room?.match.homeScore ?? match.homeScore ?? 0
                    : room?.match.awayScore ?? match.awayScore ?? 0
                  const goalsWithoutAuthor = Math.max(0, teamScore - players.reduce((total, player) => total + player.goals, 0))
                  return (
                    <div key={teamId} className="overflow-hidden rounded-lg border border-white/[0.06] bg-black/20">
                      <p className="border-b border-white/[0.05] px-2.5 py-2 text-[11px] font-bold text-white">{team?.name ?? "Time"}</p>
                      {players.map((player) => (
                        <div key={player.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 border-b border-white/[0.04] px-2.5 py-1.5 text-[10px] last:border-0">
                          <span className="truncate text-gray-300">{player.playerName}</span>
                          <span className="text-emerald-300">{player.goals} G</span>
                          <span className="text-blue-300">{player.assists} A</span>
                          <span className="text-yellow-300">{player.yellowCards ?? 0} CA</span>
                          <span className="text-red-400">{player.redCards ?? 0} CV</span>
                          <span className="w-7 text-right font-bold text-white">{player.rating?.toFixed(1) ?? "-"}</span>
                        </div>
                      ))}
                      {goalsWithoutAuthor > 0 && (
                        <p className="border-t border-amber-500/10 bg-amber-500/[0.04] px-2.5 py-2 text-[9px] leading-relaxed text-amber-300">
                          {goalsWithoutAuthor} {goalsWithoutAuthor === 1 ? "gol sem autoria individual" : "gols sem autoria individual"} no retorno da EA. Pode ser IA, gol contra ou falha na sincronização dos atletas.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!closed && mySide && match.status !== "DISPUTED" && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3">
              <Input value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Motivo para pedir análise da organização" className="h-9 min-w-56 flex-1 border-white/10 bg-black/30 text-xs" />
              <Button variant="outline" disabled={busy !== "" || reviewReason.trim().length < 3} onClick={() => void run("review", () => requestTournamentMatchReview(tournament.id, match.id, reviewReason.trim()))} className="h-9 border-red-500/25 text-xs text-red-300 hover:bg-red-500/10"><TriangleAlert className="mr-1.5 h-3.5 w-3.5" />Pedir análise</Button>
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Conversa</h3>

            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {(room?.messages ?? []).map((message) => (
                <div
                  key={message.id}
                  className={
                    message.system
                      ? "rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] italic text-gray-500"
                      : `rounded-lg px-2.5 py-1.5 text-[12px] ${
                          message.teamId && message.teamId === myTeamId
                            ? "bg-emerald-500/[0.08] text-emerald-100"
                            : "bg-white/[0.04] text-gray-200"
                        }`
                  }
                >
                  {!message.system && (
                    <span className="mr-1.5 text-[10px] font-bold text-gray-500">{message.user?.name ?? "alguém"}</span>
                  )}
                  {message.body}
                  <span className="ml-1.5 text-[9px] text-gray-600">{formatDateTime(message.createdAt)}</span>
                </div>
              ))}
              {(room?.messages ?? []).length === 0 && (
                <p className="py-3 text-center text-[11px] text-gray-600">
                  Ninguém falou nada ainda. Chame o adversário para marcar o jogo.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={body}
                onChange={(event) => setBody(event.target.value.slice(0, 600))}
                placeholder="Escreva para o adversário"
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !body.trim()) return
                  void run("chat", () => postMatchMessage(tournament.id, match.id, body.trim())).then(() => setBody(""))
                }}
                className="h-9 border-white/10 bg-white/[0.03] text-[12px]"
              />
              <Button
                size="sm"
                disabled={busy !== "" || body.trim().length === 0}
                onClick={() =>
                  void run("chat", () => postMatchMessage(tournament.id, match.id, body.trim())).then(() => setBody(""))
                }
                className="h-9 bg-white/[0.08] px-3 text-white hover:bg-white/[0.14]"
              >
                {busy === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
