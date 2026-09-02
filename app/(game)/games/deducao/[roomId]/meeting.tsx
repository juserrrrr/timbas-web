"use client"

import { useEffect, useRef, useState } from "react"
import { Fingerprint, Send, SkipForward } from "lucide-react"
import { PlayerBadge } from "./badge"
import type { Role, Snapshot } from "./use-deducao-room"

interface Props {
  snapshot: Snapshot
  me: string
  role: Role | null
  onSend: (type: string, payload?: unknown) => void
}

function useMeetingCountdown(endsAt: number) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [endsAt])

  return left
}

export function Meeting({ snapshot, me, role, onSend }: Props) {
  const meeting = snapshot.meeting
  const seconds = useMeetingCountdown(meeting.endsAt)
  const mine = snapshot.players.find((player) => player.id === me)
  const alive = mine?.alive ?? false
  const voting = snapshot.phase === "votacao" && meeting.voting
  const settled = snapshot.phase === "votacao" && !meeting.voting
  const iVoted = meeting.voted.includes(me)
  const [inspected, setInspected] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const chatList = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatList.current) chatList.current.scrollTop = chatList.current.scrollHeight
  }, [snapshot.chat.length])

  const sendChat = () => {
    const text = draft.trim()
    if (!text) return
    onSend("chat", { text })
    setDraft("")
  }

  if (settled) return <Verdict snapshot={snapshot} />

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(120,53,15,0.24),rgba(9,12,18,0.97)_48%)] backdrop-blur-xl lg:overflow-hidden">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col px-4 py-5 sm:px-6 lg:h-full lg:min-h-0 lg:px-8">
        <header className="shrink-0 rounded-3xl border border-amber-300/10 bg-black/20 px-5 py-4 text-center shadow-2xl shadow-black/20">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-amber-300/70">
            {voting ? "Votação aberta" : "Sala de reunião"}
          </p>
          <h1 className="font-display mt-2 text-3xl uppercase leading-none tracking-tight text-white sm:text-4xl">
            {meeting.reason === "corpo" ? `Corpo de ${meeting.victimName}` : "Reunião de emergência"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {meeting.reason === "corpo"
              ? `${meeting.calledByName} encontrou e chamou todo mundo.`
              : `${meeting.calledByName} apertou o botão.`}
          </p>
          <p className="mt-3 font-mono text-4xl font-black tabular-nums text-white">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
          </p>
        </header>

        <div className="mt-5 grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(24rem,0.75fr)]">
          <section className="min-h-0 lg:overflow-y-auto lg:pr-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-zinc-500">
              {voting ? "Escolha quem sai" : "Na reunião"}
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {snapshot.players.map((player) => (
                <PlayerBadge
                  key={player.id}
                  player={player}
                  you={player.id === me}
                  stamp={!player.alive ? "morto" : null}
                  selected={inspected === player.id}
                  hint={meeting.voted.includes(player.id) ? "Já votou" : player.alive ? "Vivo" : "Morto"}
                  onClick={
                    voting && alive && player.alive && !iVoted
                      ? () => onSend("vote", { targetId: player.id })
                      : !voting && alive && role === "detetive" && player.alive && player.id !== me
                        ? () => {
                            setInspected(player.id)
                            onSend("inspect", { targetId: player.id })
                          }
                        : undefined
                  }
                />
              ))}
            </div>

            {voting && alive && !iVoted && (
              <button
                type="button"
                onClick={() => onSend("vote", { targetId: "" })}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-xs font-black uppercase tracking-wide text-zinc-300 transition hover:border-white/25"
              >
                <SkipForward className="h-4 w-4" />
                Pular o voto
              </button>
            )}
            {voting && iVoted && (
              <p className="mt-4 text-center text-xs text-zinc-500">
                Voto registrado. Ninguém vê em quem, só que você votou.
              </p>
            )}
            {!voting && role === "detetive" && alive && (
              <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-sky-300/80">
                <Fingerprint className="h-3.5 w-3.5" />
                Escolha alguém para investigar. O resultado chega na próxima reunião.
              </p>
            )}
          </section>

          <aside className="flex h-72 min-h-0 flex-col rounded-2xl border border-white/[0.1] bg-black/25 p-4 shadow-xl shadow-black/20 lg:h-auto">
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-zinc-500">Discussão</p>
            <div ref={chatList} className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {snapshot.chat.map((message) => (
                <p key={message.id} className="text-[13px] leading-snug">
                  {message.system ? (
                    <span className="text-zinc-600">{message.text}</span>
                  ) : (
                    <>
                      <span className="font-bold" style={{ color: message.color }}>
                        {message.name}
                      </span>
                      <span className="text-zinc-300"> {message.text}</span>
                    </>
                  )}
                </p>
              ))}
            </div>
            {alive ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 200))}
                  onKeyDown={(event) => event.key === "Enter" && sendChat()}
                  placeholder="Onde você estava?"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendChat}
                  className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-3 text-zinc-300 transition hover:border-amber-400/40"
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="mt-3 text-center text-[11px] text-zinc-600">
                Quem morreu não fala na reunião. Sua conversa é só com os outros mortos.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function Verdict({ snapshot }: { snapshot: Snapshot }) {
  const meeting = snapshot.meeting
  const ejected = snapshot.players.find((player) => player.id === meeting.ejectedId)

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black px-6">
      <div className="text-center">
        {meeting.ejectedId && ejected ? (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-red-400/70">Resultado da votação</p>
            <h2 className="font-display mt-3 text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">
              {ejected.name} foi expulso
            </h2>
            <p className="mt-4 text-sm text-zinc-400">
              {meeting.ejectedRole
                ? meeting.ejectedRole === "assassino"
                  ? "E era mesmo o assassino."
                  : "Não era o assassino."
                : "Ninguém vai saber o que ele era."}
            </p>
            <div className="mx-auto mt-8 w-64">
              <PlayerBadge player={ejected} role={meeting.ejectedRole || undefined} stamp="demitido" />
            </div>
          </>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-zinc-500">Sem decisão</p>
            <h2 className="font-display mt-3 text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">
              {meeting.tie ? "Deu empate" : "Ninguém saiu"}
            </h2>
            <p className="mt-4 text-sm text-zinc-400">
              {meeting.skips > 0 ? `${meeting.skips} pularam o voto. ` : ""}A partida continua.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
