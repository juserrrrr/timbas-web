"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarClock, Check, Clock, Loader2, Play, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusPill, formatDateTime } from "@/components/competitions/shared"
import { getWaitingRoom, setDraftReady, startDraft, type WaitingRoom } from "@/lib/services/draft"
import type { DraftLeagueDetail } from "@/lib/services/draft.types"

const POLL_MS = 5000

/// Sala de espera do draft ao vivo: todo mundo marca presença e, quando o último
/// marca, o draft abre sozinho para ninguém escolher sem o outro estar junto.
export function WaitingRoomPanel({ league, onChanged }: { league: DraftLeagueDetail; onChanged: () => void }) {
  const [room, setRoom] = useState<WaitingRoom | null>(null)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      setRoom(await getWaitingRoom(league.id))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir a sala de espera.")
    }
  }, [league.id])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  if (!room) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    )
  }

  const myRoster = room.rosters.find((roster) => roster.id === league.access.rosterId)
  const iAmReady = Boolean(myRoster?.readyAt)
  const isLive = room.startMode === "LIVE"

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key)
    setError("")
    try {
      await action()
      setNotice(message)
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/25 bg-emerald-500/[0.05] p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-black text-white">
            {isLive ? "Sala de espera do draft" : "Draft assíncrono"}
          </h3>
          <StatusPill tone={room.everyoneReady ? "done" : "warn"}>
            {room.readyCount}/{room.ownedCount} prontos
          </StatusPill>
          {room.vacantCount > 0 && <StatusPill tone="neutral">{room.vacantCount} vaga(s)</StatusPill>}
        </div>

        <p className="text-[11px] leading-snug text-gray-400">
          {isLive
            ? "Todo mundo escolhe junto: o draft abre no instante em que o último time dá pronto. Vaga aberta não precisa marcar, ela escolhe sozinha."
            : "Cada um escolhe quando puder. O dono abre o draft e o cronômetro corre; quem não aparecer é escolhido pelo relógio."}
        </p>

        {room.draftStartsAt && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-200">
            <CalendarClock className="h-3.5 w-3.5" />
            Marcado para {formatDateTime(room.draftStartsAt)}
            {room.waitingForTime ? ", ainda não deu a hora" : ""}
          </p>
        )}

        {room.poolAvailable < room.poolNeeded && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-300">
            <Clock className="h-3.5 w-3.5" />
            Faltam jogadores no pool: {room.poolAvailable} de {room.poolNeeded} necessários.
          </p>
        )}

        {notice && <p className="mt-2 text-[11px] text-emerald-300">{notice}</p>}
        {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {myRoster && isLive && (
            <Button
              disabled={busy !== ""}
              onClick={() =>
                void run(
                  "ready",
                  () => setDraftReady(league.id, !iAmReady),
                  iAmReady ? "Você saiu da lista de prontos." : "Pronto! Falta o resto do pessoal.",
                )
              }
              className={
                iAmReady
                  ? "bg-white/[0.08] text-white hover:bg-white/[0.14]"
                  : "bg-emerald-500 text-black hover:bg-emerald-400"
              }
            >
              {busy === "ready" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {iAmReady ? "Ainda não estou pronto" : "Estou pronto"}
            </Button>
          )}

          {league.access.canManage && (
            <Button
              variant="outline"
              disabled={busy !== "" || room.rosters.length < 2}
              onClick={() =>
                void run("start", () => startDraft(league.id, true, true), "Draft aberto.")
              }
            >
              <Play className="mr-1.5 h-4 w-4" />
              {isLive ? "Começar mesmo assim" : "Abrir o draft"}
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {room.rosters.map((roster) => {
          const vacant = roster.userId === null
          const ready = Boolean(roster.readyAt)
          return (
            <Card
              key={roster.id}
              className={`flex items-center gap-3 p-3 ${
                vacant
                  ? "border-white/[0.05] bg-white/[0.015]"
                  : ready
                    ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                    : "border-white/[0.07] bg-white/[0.025]"
              }`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                  vacant ? "bg-white/[0.04] text-gray-600" : ready ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.06] text-gray-400"
                }`}
              >
                {roster.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{roster.name}</p>
                <p className="truncate text-[11px] text-gray-600">
                  {vacant ? "vaga aberta, escolhe sozinha" : (roster.user?.name ?? "sem nome")}
                </p>
              </div>
              {!vacant && (
                <StatusPill tone={ready ? "done" : "neutral"}>{ready ? "pronto" : "esperando"}</StatusPill>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
