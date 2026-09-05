"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, Lock, LogOut, Mic, MicOff, Play, Send } from "lucide-react"
import { toast } from "@/lib/toast"
import { PlayerBadge } from "./badge"
import { MicrophoneSetup } from "./microphone-setup"
import { LobbyRules } from "./lobby-rules"
import type { Snapshot } from "./use-deducao-room"
import type { VoiceControls } from "./use-proximity-voice"

interface Props {
  snapshot: Snapshot
  me: string
  minPlayers: number
  voice: VoiceControls
  exploring?: boolean
  canExplore?: boolean
  onExploreChange: (exploring: boolean) => void
  onSend: (type: string, payload?: unknown) => void
  onLeave: () => void
}

export function Lobby({ snapshot, me, minPlayers, voice, exploring = false, canExplore = true, onExploreChange, onSend, onLeave }: Props) {
  const isHost = snapshot.hostId === me
  const mine = snapshot.players.find((player) => player.id === me)
  const microphoneReady = voice.configured && Boolean(mine?.microphoneReady) && mine?.connected !== false && !voice.busy
  const missingMicrophones = snapshot.players.filter((player) => !player.microphoneReady).length
  const disconnectedPlayers = snapshot.players.filter((player) => player.connected === false).length
  const missing = Math.max(0, minPlayers - snapshot.players.length)
  const notReady = snapshot.players.filter((player) => !player.ready && player.id !== snapshot.hostId).length
  const canStartSolo = snapshot.hostCanStartSolo
  const canStart = microphoneReady && missingMicrophones === 0 && disconnectedPlayers === 0 && (canStartSolo || missing === 0) && notReady === 0
  const readiness = mine?.connected === false
    ? "Aguardando sua reconexão à sala."
    : disconnectedPlayers > 0 ? `Aguardando ${disconnectedPlayers} reconectar à sala.`
      : !microphoneReady
        ? voice.busy ? "Aguarde a configuração do microfone." : voice.configured ? "Aguardando a confirmação do microfone na sala." : "Configure seu microfone para ficar pronto."
        : missingMicrophones > 0 ? `${missingMicrophones} ainda precisam configurar o microfone.`
          : notReady > 0 ? `${notReady} ainda não marcaram pronto.`
            : canStartSolo && missing > 0 ? "Você pode iniciar sozinho para testar."
              : missing > 0 ? `Faltam ${missing} para começar.`
                : isHost ? "Todo mundo pronto. É com você." : "Esperando o anfitrião começar."
  const toggleReady = () => { if (mine?.ready || microphoneReady) onSend("ready") }
  const start = () => { if (canStart) onSend("start") }
  const [draft, setDraft] = useState("")
  const chatList = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatList.current) chatList.current.scrollTop = chatList.current.scrollHeight
  }, [snapshot.chat.length])

  const copyCode = async () => {
    await navigator.clipboard.writeText(snapshot.code)
    toast.success("Código copiado.")
  }

  const sendChat = () => {
    const text = draft.trim()
    if (!text) return
    onSend("chat", { text })
    setDraft("")
  }

  if (exploring) return (
    <div data-lobby-dock className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+5.75rem)] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2">
      <div className="pointer-events-auto flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-zinc-950/85 p-1.5 shadow-lg" role="group" aria-label="Preparação da partida">
        <button type="button" onClick={(event) => { event.currentTarget.blur(); onExploreChange(false) }}
          className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-white/15 px-2 text-xs font-semibold text-zinc-200 hover:bg-white/10">
          Preparação
        </button>
        <button type="button" disabled={!mine?.ready && !microphoneReady} aria-describedby="lobby-readiness"
          aria-pressed={Boolean(mine?.ready)} title={readiness}
          onPointerDown={(event) => { if (event.pointerType !== "mouse") event.preventDefault() }}
          onClick={(event) => { event.currentTarget.blur(); toggleReady() }}
          className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-emerald-400/30 px-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-zinc-500">
          <span className="block truncate">{mine?.ready ? "Não estou pronto" : "Estou pronto"}</span>
        </button>
        {isHost && <button type="button" disabled={!canStart} aria-describedby="lobby-readiness" title={readiness}
          onPointerDown={(event) => { if (event.pointerType !== "mouse") event.preventDefault() }}
          onClick={(event) => { event.currentTarget.blur(); start() }}
          className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-xl bg-amber-400 px-2 text-xs font-bold text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500">
          Começar partida
        </button>}
      </div>
      <p id="lobby-readiness" className="sr-only" role="status">{readiness}</p>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 px-4 py-4 sm:px-6 lg:overflow-hidden lg:px-8 lg:py-5">
      <div className="mx-auto flex min-h-full max-w-[1600px] flex-col lg:h-full lg:min-h-0">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/70">
              Timbas Detetive
            </p>
            <h1 className="font-display mt-2 flex items-center gap-3 text-3xl uppercase leading-none tracking-tight text-white sm:text-4xl">
              {snapshot.roomName}
              {snapshot.private && <Lock className="h-5 w-5 text-zinc-600" />}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyCode()}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-2.5 font-mono text-lg font-bold tracking-[0.24em] text-amber-300 transition hover:bg-amber-400/[0.12]"
            >
              {snapshot.code}
              <Copy className="h-3.5 w-3.5 opacity-60" />
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="cursor-pointer rounded-xl border border-white/10 p-3 text-zinc-400 transition hover:border-red-500/30 hover:text-red-300"
              aria-label="Sair da sala"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="mt-4 flex shrink-0 flex-wrap items-center gap-3">
          <button type="button" disabled={!canExplore} onClick={(event) => { if (!canExplore) return; event.currentTarget.blur(); onExploreChange(true) }}
            className="min-h-11 cursor-pointer rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-wait disabled:opacity-50">
            {canExplore ? "Testar na sala" : "Sala de testes carregando"}
          </button>
          <p className="max-w-lg text-xs leading-relaxed text-zinc-400">Ande pela sala e teste os controles antes de marcar Pronto. Você pode explorar antes de configurar o microfone.</p>
        </div>

        <div className="mt-5 grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(26rem,0.8fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(34rem,0.75fr)]">
          <section className="min-h-0 lg:overflow-y-auto lg:pr-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Jogadores</h2>
              <span className="font-mono text-xs text-zinc-500">{snapshot.players.length}/12</span>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {snapshot.players.map((player) => (
                <PlayerBadge
                  key={player.id}
                  player={player}
                  you={player.id === me}
                  host={player.id === snapshot.hostId}
                  hint={player.connected === false ? "Desconectado" : !player.microphoneReady ? "Microfone pendente" : player.ready ? "Pronto" : "Esperando"}
                  footer={
                    <div className="mt-3">
                      <span className={`flex items-center gap-1.5 text-[10px] ${player.microphoneReady ? "text-emerald-300/80" : "text-zinc-500"}`}>
                        {player.microphoneReady ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                        {player.microphoneReady ? "Microfone configurado" : "Microfone não configurado"}
                      </span>
                      <span className={`mt-2 block h-1 rounded-full ${player.connected !== false && player.microphoneReady && (player.ready || player.id === snapshot.hostId) ? "bg-emerald-400/70" : "bg-white/[0.08]"}`} />
                    </div>
                  }
                />
              ))}
            </div>

            <MicrophoneSetup voice={voice} serverReady={Boolean(mine?.microphoneReady)} />

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleReady}
                disabled={!mine?.ready && !microphoneReady}
                aria-describedby="lobby-readiness"
                className="cursor-pointer rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:border-emerald-400/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="mr-2 inline h-4 w-4" />
                {mine?.ready ? "Não estou pronto" : "Estou pronto"}
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={start}
                  disabled={!canStart}
                  aria-describedby="lobby-readiness"
                  className="cursor-pointer rounded-xl bg-amber-400 px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
                >
                  <Play className="mr-2 inline h-4 w-4" />
                  Começar partida
                </button>
              )}

              <p id="lobby-readiness" className="text-xs text-zinc-500">
                {readiness}
              </p>
            </div>
          </section>

          <aside className="grid min-h-0 gap-4 lg:grid-rows-[auto_minmax(9rem,1fr)] lg:overflow-y-auto lg:pr-2">
            <LobbyRules snapshot={snapshot} isHost={isHost} onSend={onSend} />

            <section className="flex h-64 min-h-0 flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 lg:h-auto">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Chat</h2>
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
              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 200))}
                  onKeyDown={(event) => event.key === "Enter" && sendChat()}
                  placeholder="Fala aí"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendChat}
                  className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-3 text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-200"
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
