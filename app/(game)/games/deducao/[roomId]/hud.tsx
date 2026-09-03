"use client"

import { useEffect, useRef, useState } from "react"
import { AlertOctagon, Ghost, Hand, LogOut, Map as MapIcon, Search, Siren, Skull, Wind, X } from "lucide-react"
import { playGameSound, unlockGameAudio } from "@/lib/games/game-audio"
import type { MapTaskSpot, OfficeMap } from "@/lib/services/games"
import type { Quality, Targets } from "./match-types"
import type { InputState } from "./scene/office-scene"
import { Minimap } from "./minimap"
import type { Notice, Role, Snapshot } from "./use-deducao-room"

interface Props {
  snapshot: Snapshot
  map: OfficeMap
  me: string
  role: Role | null
  pendingTasks: string[]
  targets: Targets
  notices: Notice[]
  quality: Quality
  onQuality: (quality: Quality) => void
  poseRef: React.MutableRefObject<{ x: number; z: number; dir: number }>
  onSend: (type: string, payload?: unknown) => void
  onOpenTask: (spot: MapTaskSpot) => void
  onLeave: () => void
  inputRef: React.MutableRefObject<InputState>
}

const ROLE_COPY: Record<Role, { title: string; tone: string }> = {
  assassino: { title: "Assassino", tone: "text-red-400" },
  detetive: { title: "Detetive", tone: "text-sky-300" },
  funcionario: { title: "Funcionário", tone: "text-emerald-300" },
}

export function Hud({
  snapshot,
  map,
  me,
  role,
  pendingTasks,
  targets,
  notices,
  quality,
  onQuality,
  poseRef,
  onSend,
  onOpenTask,
  onLeave,
  inputRef,
}: Props) {
  const [mapaAberto, setMapaAberto] = useState(false)
  const mine = snapshot.players.find((player) => player.id === me)
  const alive = mine?.alive ?? true
  const progress = snapshot.tasksTotal > 0 ? snapshot.tasksDone / snapshot.tasksTotal : 0
  const spots = map.taskSpots.filter((spot) => pendingTasks.includes(spot.id))
  const roomName = (id: string) => map.rooms.find((room) => room.id === id)?.name ?? id
  const floorName = mine?.level === 1 ? "2º andar" : "Térreo"
  const visibleNotices =
    role === "assassino" ? notices.filter((notice) => notice.text !== "A luz caiu. Ninguém enxerga direito.") : notices

  // Dentro do duto, para onde dá para ir. O servidor sempre soube fazer a
  // viagem; faltava a tela oferecer o destino, e sem ela o duto era um buraco
  // de mão única onde só dava para entrar e sair no mesmo lugar.
  const ventAtual = mine?.inVent ? targets.vent : null
  const destinos = (ventAtual?.links ?? [])
    .map((id) => map.vents.find((vent) => vent.id === id))
    .filter((vent): vent is NonNullable<typeof vent> => Boolean(vent))

  useEffect(() => {
    const tecla = (event: KeyboardEvent) => {
      const digitando = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA"
      if (digitando || event.repeat) return
      if (event.code === "KeyM" || event.code === "Tab") {
        event.preventDefault()
        setMapaAberto((aberto) => !aberto)
      } else if (event.code === "Escape") {
        setMapaAberto(false)
      }
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {snapshot.blackout && role !== "assassino" && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(0,0,0,0.82)_78%)]">
          <p className="absolute left-1/2 top-6 -translate-x-1/2 font-mono text-[11px] font-bold uppercase tracking-[0.4em] text-red-400/80">
            Luz apagada
          </p>
        </div>
      )}

      {/* O progresso do time fica visível sem cobrir a área de jogo. O painel
          escuro é o que segura o texto legível agora que o chão do escritório é
          claro. */}
      <div className="absolute left-4 top-4 w-56 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm sm:left-6 sm:top-6 sm:w-72">
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">
          <span>Tarefas do time</span>
          <span className="text-amber-300">
            {snapshot.tasksDone}/{snapshot.tasksTotal}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-300 transition-[width] duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        {role && (
          <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.22em] ${ROLE_COPY[role].tone}`}>
            {alive ? ROLE_COPY[role].title : "Morto"} · {floorName}
          </p>
        )}
      </div>

      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-2 sm:right-6 sm:top-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMapaAberto((aberto) => !aberto)}
            className="cursor-pointer rounded-lg border border-white/10 bg-black/60 p-2 text-zinc-400 transition hover:border-amber-400/40 hover:text-amber-300"
            aria-label="Abrir a planta"
            title="Planta do escritório (M)"
          >
            <MapIcon className="h-4 w-4" />
          </button>
          <select
            value={quality}
            onChange={(event) => onQuality(event.target.value as Quality)}
            className="cursor-pointer rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 focus:outline-none"
            aria-label="Qualidade gráfica"
          >
            <option value="alto">Gráficos altos</option>
            <option value="medio">Gráficos médios</option>
            <option value="baixo">Gráficos leves</option>
          </select>
          <button
            type="button"
            onClick={onLeave}
            className="cursor-pointer rounded-lg border border-white/10 bg-black/60 p-2 text-zinc-400 transition hover:border-red-500/40 hover:text-red-300"
            aria-label="Sair da partida"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Planta sempre à vista. Em primeira pessoa ela deixa de ser luxo: sem
            ela ninguém acha a sala dos servidores num escritório de 95 metros. */}
        <div className="hidden w-44 rounded-xl border border-white/10 bg-black/55 p-1.5 backdrop-blur-sm sm:block lg:w-56">
          <Minimap map={map} spots={spots} role={role} poseRef={poseRef} />
        </div>
      </div>

      {/* Lista de tarefas: o que falta e onde, sem abrir menu nenhum. */}
      <div className="absolute bottom-24 left-4 w-56 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm sm:bottom-6 sm:left-6 sm:w-64">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">Suas tarefas</p>
        <ul className="mt-2 space-y-1.5">
          {spots.length === 0 && <li className="text-[11px] text-emerald-300/80">Suas tarefas acabaram.</li>}
          {spots.map((spot) => (
            <li
              key={spot.id}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] leading-tight transition ${
                targets.task?.id === spot.id
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/[0.06] text-zinc-300"
              }`}
            >
              <span className="block font-semibold">{spot.label}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-70">
                {roomName(spot.room)} · {(spot.level ?? 0) === 1 ? "2º andar" : "térreo"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ações. Uma coluna à direita, o polegar do celular alcança tudo. */}
      <div className="pointer-events-auto absolute bottom-6 right-4 flex flex-col items-end gap-3 sm:right-6">
        {role === "assassino" && alive && (
          <>
            <ActionButton
              label={targets.kill ? `Matar ${targets.kill.name}` : "Matar"}
              icon={<Skull className="h-6 w-6" />}
              tone="perigo"
              shortcut="Q"
              disabled={!targets.kill}
              onClick={() => {
                if (!targets.kill) return
                playGameSound("kill")
                onSend("kill", { targetId: targets.kill.id })
              }}
            />
            {mine?.inVent ? (
              <>
                {destinos.map((vent, indice) => (
                  <ActionButton
                    key={vent.id}
                    label={`Ir para ${roomName(vent.room)}`}
                    icon={<Wind className="h-5 w-5" />}
                    tone="neutro"
                    small
                    shortcut={String(indice + 1)}
                    onClick={() => {
                      playGameSound("vent")
                      onSend("vent", { ventId: vent.id })
                    }}
                  />
                ))}
                <ActionButton
                  label="Sair do duto"
                  icon={<X className="h-5 w-5" />}
                  tone="neutro"
                  small
                  shortcut="V"
                  onClick={() => {
                    playGameSound("vent")
                    onSend("vent", { ventId: "" })
                  }}
                />
              </>
            ) : (
              <ActionButton
                label="Entrar no duto"
                icon={<Wind className="h-5 w-5" />}
                tone="neutro"
                small
                shortcut="V"
                disabled={!targets.vent}
                onClick={() => {
                  playGameSound("vent")
                  onSend("vent", { ventId: targets.vent?.id })
                }}
              />
            )}
            <ActionButton
              label="Apagar a luz"
              icon={<AlertOctagon className="h-5 w-5" />}
              tone="neutro"
              small
              shortcut="F"
              onClick={() => {
                playGameSound("action")
                onSend("sabotage")
              }}
            />
          </>
        )}

        {targets.corpse && alive && (
          <ActionButton
            label={`Reportar ${targets.corpse.name}`}
            icon={<Search className="h-6 w-6" />}
            tone="alerta"
            shortcut="R"
            onClick={() => {
              playGameSound("action")
              onSend("report", { corpseId: targets.corpse!.id })
            }}
          />
        )}

        {targets.emergency && alive && (mine?.emergenciesLeft ?? 0) > 0 && (
          <ActionButton
            label="Reunião de emergência"
            icon={<Siren className="h-6 w-6" />}
            tone="alerta"
            shortcut="R"
            onClick={() => {
              playGameSound("action")
              onSend("emergency")
            }}
          />
        )}

        <ActionButton
          label={targets.task ? "Fazer tarefa" : "Nada por perto"}
          icon={<Hand className="h-6 w-6" />}
          tone="principal"
          shortcut="E"
          disabled={!targets.task}
          onClick={() => {
            if (!targets.task) return
            playGameSound("action")
            onOpenTask(targets.task)
          }}
        />
      </div>

      {mapaAberto && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{map.name}</p>
              <button
                type="button"
                onClick={() => setMapaAberto(false)}
                className="cursor-pointer rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white"
                aria-label="Fechar a planta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Minimap map={map} spots={spots} role={role} poseRef={poseRef} grande />
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Amarelo é tarefa sua, vermelho é o botão de emergência
            </p>
          </div>
        </div>
      )}

      {!alive && (
        <p className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-zinc-400">
          <Ghost className="h-3.5 w-3.5" />
          Você morreu. Continue as tarefas, mas não conte nada para quem está vivo.
        </p>
      )}

      {alive && (
        <p className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-400 backdrop-blur-sm md:block">
          WASD mover · Shift correr · M mapa
        </p>
      )}

      <div className="absolute left-1/2 top-20 w-[min(90vw,26rem)] -translate-x-1/2 space-y-2">
        {visibleNotices.map((notice) => (
          <p
            key={notice.id}
            className={`rounded-xl border px-4 py-2.5 text-center text-[13px] font-semibold backdrop-blur ${
              notice.kind === "perigo"
                ? "border-red-500/30 bg-red-950/70 text-red-200"
                : notice.kind === "pista"
                  ? "border-sky-400/30 bg-sky-950/70 text-sky-200"
                  : "border-amber-400/30 bg-amber-950/70 text-amber-100"
            }`}
          >
            {notice.text}
          </p>
        ))}
      </div>

      <TouchStick inputRef={inputRef} />
    </div>
  )
}

function ActionButton({
  label,
  icon,
  tone,
  disabled,
  small,
  shortcut,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  tone: "principal" | "perigo" | "alerta" | "neutro"
  disabled?: boolean
  small?: boolean
  shortcut?: string
  onClick: () => void
}) {
  const tones = {
    principal: "border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25",
    perigo: "border-red-500/50 bg-red-500/15 text-red-200 hover:bg-red-500/25",
    alerta: "border-orange-400/50 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25",
    neutro: "border-white/15 bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border pl-4 pr-5 backdrop-blur transition disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-zinc-600 ${
        small ? "py-2.5" : "py-3.5"
      } ${tones[tone]}`}
    >
      <span className={small ? "text-xs" : "text-sm"}>{icon}</span>
      <span className={`font-black uppercase tracking-wide ${small ? "text-[10px]" : "text-xs"}`}>{label}</span>
      {shortcut && (
        <kbd className="ml-1 rounded-md border border-current/20 bg-black/20 px-1.5 py-0.5 font-mono text-[9px] opacity-70">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

/// Manche de toque. Só aparece quando a tela é de dedo, e escreve no mesmo ref
/// que o teclado usa, então a cena não precisa saber de onde veio o movimento.
function TouchStick({ inputRef }: { inputRef: React.MutableRefObject<InputState> }) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const touchId = useRef<number | null>(null)

  useEffect(() => {
    const onStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (touchId.current !== null || touch.clientX > window.innerWidth * 0.55) return
      unlockGameAudio()
      touchId.current = touch.identifier
      setOrigin({ x: touch.clientX, y: touch.clientY })
    }
    const onMove = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier !== touchId.current || !origin) continue
        const dx = touch.clientX - origin.x
        const dy = touch.clientY - origin.y
        const length = Math.min(Math.hypot(dx, dy), 56)
        const angle = Math.atan2(dy, dx)
        const knobX = Math.cos(angle) * length
        const knobY = Math.sin(angle) * length
        setKnob({ x: knobX, y: knobY })
        inputRef.current = { x: knobX / 56, z: knobY / 56, sprint: false }
      }
    }
    const onEnd = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier !== touchId.current) continue
        touchId.current = null
        setOrigin(null)
        setKnob({ x: 0, y: 0 })
        inputRef.current = { x: 0, z: 0, sprint: false }
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true })
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onEnd)
    window.addEventListener("touchcancel", onEnd)
    return () => {
      window.removeEventListener("touchstart", onStart)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
    }
  }, [origin, inputRef])

  if (!origin) return null
  return (
    <div
      className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/[0.04]"
      style={{ left: origin.x, top: origin.y }}
    >
      <span
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/70"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  )
}
