"use client"

import { RotateCcw, LogOut } from "lucide-react"
import { PlayerBadge } from "./badge"
import type { Snapshot } from "./use-deducao-room"

interface Props {
  snapshot: Snapshot
  me: string
  roles: Record<string, string>
  onSend: (type: string, payload?: unknown) => void
  onLeave: () => void
}

export function EndScreen({ snapshot, me, roles, onSend, onLeave }: Props) {
  const crewWon = snapshot.winner === "escritorio"
  const isHost = snapshot.hostId === me

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 overflow-y-auto bg-zinc-950/97 backdrop-blur-md">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="text-center">
          <p
            className={`font-mono text-[10px] font-bold uppercase tracking-[0.34em] ${crewWon ? "text-emerald-300/70" : "text-red-400/70"}`}
          >
            Fim de jogo
          </p>
          <h1
            className={`font-display mt-3 text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl ${crewWon ? "text-emerald-300" : "text-red-400"}`}
          >
            {crewWon ? "Os funcionários venceram" : "Os assassinos venceram"}
          </h1>
          <p className="mt-3 text-sm text-zinc-400">{snapshot.endReason}</p>
        </header>

        <section className="mt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-zinc-500">Quem era quem</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.players.map((player) => (
              <PlayerBadge
                key={player.id}
                player={player}
                you={player.id === me}
                role={roles[player.id] ?? "funcionario"}
                stamp={!player.alive ? "morto" : null}
                footer={
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    {player.tasksDone}/{player.tasksTotal} tarefas
                  </p>
                }
              />
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {isHost && (
            <button
              type="button"
              onClick={() => onSend("restart")}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300"
            >
              <RotateCcw className="h-4 w-4" />
              Outra partida
            </button>
          )}
          <button
            type="button"
            onClick={onLeave}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-zinc-300 transition hover:border-white/25"
          >
            <LogOut className="h-4 w-4" />
            Sair da sala
          </button>
          {!isHost && (
            <p className="w-full text-center text-xs text-zinc-600">
              O anfitrião pode abrir outra partida com a mesma galera.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
