"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarClock, Camera, Check, Clock, Loader2, Send, TriangleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { StatusPill, TeamCrest, formatDateTime } from "@/components/competitions/shared"
import {
  claimMatchResult,
  getMatchRoom,
  postMatchMessage,
  proposeMatchSchedule,
  respondMatchClaim,
  respondMatchSchedule,
  type MatchRoom,
} from "@/lib/services/tournaments"
import type { TournamentDetail, TournamentMatch } from "@/lib/services/tournaments.types"

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
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
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
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")

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

          {!closed && mySide && (
            <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Horário</h3>

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
                        proposeMatchSchedule(tournament.id, match.id, new Date(when).toISOString()),
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

          {!closed && mySide && (
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onOpenPhoto}
                      className="h-9 px-3 text-[12px]"
                    >
                      <Camera className="mr-1.5 h-3.5 w-3.5" />
                      Com foto
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
