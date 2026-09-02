"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, Lock, LogOut, Play, Send } from "lucide-react"
import { toast } from "@/lib/toast"
import { PlayerBadge } from "./badge"
import type { Snapshot } from "./use-deducao-room"

interface Props {
  snapshot: Snapshot
  me: string
  minPlayers: number
  onSend: (type: string, payload?: unknown) => void
  onLeave: () => void
}

/// A regra que o anfitrião escolhe, com o texto que explica o efeito dela na
/// partida em vez do nome do campo no servidor.
const RULES: { key: string; label: string; hint: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: "killers", label: "Assassinos", hint: "Quantos entram na sala de faca na mão", min: 1, max: 3, step: 1 },
  { key: "tasksPerPlayer", label: "Tarefas por pessoa", hint: "Quanto trabalho cada um leva para casa", min: 2, max: 8, step: 1 },
  { key: "killCooldownMs", label: "Espera entre abates", hint: "Quanto o assassino aguenta sem matar", min: 10000, max: 60000, step: 5000, unit: "s" },
  { key: "meetingSeconds", label: "Discussão", hint: "Tempo de conversa antes de votar", min: 15, max: 120, step: 5, unit: "s" },
  { key: "voteSeconds", label: "Votação", hint: "Tempo para escolher quem sai", min: 15, max: 120, step: 5, unit: "s" },
  { key: "blackoutEverySeconds", label: "Apagão a cada", hint: "De quanto em quanto tempo a luz cai", min: 60, max: 600, step: 30, unit: "s" },
]

export function Lobby({ snapshot, me, minPlayers, onSend, onLeave }: Props) {
  const isHost = snapshot.hostId === me
  const missing = Math.max(0, minPlayers - snapshot.players.length)
  const notReady = snapshot.players.filter((player) => !player.ready && player.id !== snapshot.hostId).length
  const [draft, setDraft] = useState("")
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" })
  }, [snapshot.chat.length])

  const copyCode = async () => {
    await navigator.clipboard.writeText(snapshot.code)
    toast.success("Código copiado. Cole no chat e chame a galera.")
  }

  const sendChat = () => {
    const text = draft.trim()
    if (!text) return
    onSend("chat", { text })
    setDraft("")
  }

  return (
    <div className="min-h-full bg-zinc-950 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/70">
              Timbas Detetive · sala de espera
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                Crachás na mesa
              </h2>
              <span className="font-mono text-xs text-zinc-500">{snapshot.players.length}/12</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {snapshot.players.map((player) => (
                <PlayerBadge
                  key={player.id}
                  player={player}
                  you={player.id === me}
                  host={player.id === snapshot.hostId}
                  hint={player.ready ? "Pronto" : "Esperando"}
                  footer={
                    <span
                      className={`mt-3 block h-1 rounded-full ${player.ready || player.id === snapshot.hostId ? "bg-emerald-400/70" : "bg-white/[0.08]"}`}
                    />
                  }
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onSend("ready")}
                className="cursor-pointer rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:border-emerald-400/40 hover:text-emerald-300"
              >
                <Check className="mr-2 inline h-4 w-4" />
                {snapshot.players.find((player) => player.id === me)?.ready ? "Não estou pronto" : "Estou pronto"}
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={() => onSend("start")}
                  disabled={missing > 0 || notReady > 0}
                  className="cursor-pointer rounded-xl bg-amber-400 px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
                >
                  <Play className="mr-2 inline h-4 w-4" />
                  Bater o ponto
                </button>
              )}

              <p className="text-xs text-zinc-500">
                {missing > 0
                  ? `Faltam ${missing} para começar.`
                  : notReady > 0
                    ? `${notReady} ainda não marcaram pronto.`
                    : isHost
                      ? "Todo mundo pronto. É com você."
                      : "Esperando o anfitrião começar."}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                Regras do expediente
              </h2>

              <div className="mt-4 space-y-4">
                {RULES.map((rule) => {
                  const raw = Number(snapshot.config[rule.key] ?? 0)
                  const shown = rule.unit === "s" && rule.key.endsWith("Ms") ? raw / 1000 : raw
                  return (
                    <div key={rule.key}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-bold text-zinc-300">{rule.label}</span>
                        <span className="font-mono text-sm font-bold text-amber-300">
                          {shown}
                          {rule.unit ?? ""}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={rule.min}
                        max={rule.max}
                        step={rule.step}
                        value={raw}
                        disabled={!isHost}
                        onChange={(event) => onSend("config", { [rule.key]: Number(event.target.value) })}
                        className="mt-2 w-full cursor-pointer accent-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <p className="mt-1 text-[11px] leading-snug text-zinc-600">{rule.hint}</p>
                    </div>
                  )
                })}

                <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <span>
                    <span className="block text-xs font-bold text-zinc-300">Detetive na sala</span>
                    <span className="mt-1 block text-[11px] text-zinc-600">
                      Alguém consegue uma leitura por reunião, com uma reunião de atraso
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(snapshot.config.withDetective)}
                    disabled={!isHost}
                    onChange={(event) => onSend("config", { withDetective: event.target.checked })}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
                  />
                </label>
              </div>

              {!isHost && (
                <p className="mt-4 text-[11px] text-zinc-600">Quem ajusta as regras é o anfitrião.</p>
              )}
            </section>

            <section className="flex h-72 flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Conversa</h2>
              <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
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
                <div ref={chatEnd} />
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
