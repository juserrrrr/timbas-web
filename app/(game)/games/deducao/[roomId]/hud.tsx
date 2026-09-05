"use client"

import { useEffect, useState } from "react"
import { AlertOctagon, ClipboardList, Hand, LoaderCircle, Map as MapIcon, Mic, MicOff, Search, Settings2, Siren, Skull, Wind, X } from "lucide-react"
import { playGameSound } from "@/lib/games/game-audio"
import type { MapTaskSpot, OfficeMap } from "@/lib/services/games"
import type { Quality, Targets } from "./match-types"
import { gameKeyCode, isGameControlTarget } from "./keyboard-controls"
import type { InputState } from "./scene/office-scene"
import { HudPanels, type HudPanel } from "./hud-panels"
import { TouchControls } from "./touch-controls"
import { canSabotage, sabotageRemainingMs, type SabotageStatus } from "./sabotage-cooldown"
import { canCallEmergency, emergencyRemainingMs, type EmergencyStatus } from "./emergency-cooldown"
import type { Notice, Role, Snapshot } from "./use-deducao-room"
import type { VoiceControls } from "./use-proximity-voice"

interface Props {
  snapshot: Snapshot
  map: OfficeMap
  me: string
  role: Role | null
  sabotageStatus: SabotageStatus | null
  onSabotage: () => void
  emergencyStatus: EmergencyStatus | null
  onEmergency: () => void
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
  controlsEnabled: boolean
  mapOpen: boolean
  onMapOpenChange: (open: boolean) => void
  panel: HudPanel
  onPanelChange: (panel: HudPanel) => void
  voice: VoiceControls
  lobby?: boolean
  onLobbySetup?: () => void
}

const ROLE_COPY: Record<Role, { title: string; tone: string }> = {
  assassino: { title: "Assassino", tone: "text-red-400" },
  detetive: { title: "Detetive", tone: "text-sky-300" },
  funcionario: { title: "Funcionário", tone: "text-emerald-300" },
}
const TOOL_BUTTON = "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-zinc-950/80 text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"

export function Hud({ snapshot, map, me, role, sabotageStatus, onSabotage, emergencyStatus, onEmergency,
  pendingTasks, targets, notices, quality, onQuality, poseRef, onSend, onOpenTask, onLeave, inputRef,
  controlsEnabled, mapOpen, onMapOpenChange, panel, onPanelChange, voice, lobby = false, onLobbySetup }: Props) {
  const [touchControls, setTouchControls] = useState(false)
  const mine = snapshot.players.find((player) => player.id === me)
  const alive = mine?.alive ?? true
  const progress = snapshot.tasksTotal > 0 ? Math.min(1, snapshot.tasksDone / snapshot.tasksTotal) : 0
  const spots = map.taskSpots.filter((spot) => pendingTasks.includes(spot.id))
  const roomName = (id: string) => map.rooms.find((room) => room.id === id)?.name ?? id
  const uiEnabled = controlsEnabled || mapOpen || Boolean(panel)
  const readyPlayers = snapshot.players.filter((player) => player.ready).length
  const ventAtual = mine?.inVent ? targets.vent : null
  const destinos = (ventAtual?.links ?? []).map((id) => map.vents.find((vent) => vent.id === id))
    .filter((vent): vent is NonNullable<typeof vent> => Boolean(vent))

  useEffect(() => {
    const tecla = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.metaKey || event.ctrlKey) return
      const code = gameKeyCode(event)
      if (code === "Escape" && (mapOpen || panel)) {
        onMapOpenChange(false)
        onPanelChange(null)
        return
      }
      if (isGameControlTarget(event.target) || isGameControlTarget(document.activeElement)) return
      if (!controlsEnabled && !mapOpen) return
      if (!lobby && (code === "KeyM" || (code === "Tab" && document.pointerLockElement))) {
        event.preventDefault()
        onMapOpenChange(!mapOpen)
      }
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [controlsEnabled, mapOpen, panel, onMapOpenChange, onPanelChange, lobby])

  return (
    <div className="group/hud pointer-events-none absolute inset-0 select-none">
      {snapshot.blackout && (
        <div className={role === "assassino" && alive
          ? "absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(35,0,4,0.28)_100%)]"
          : "absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(0,0,0,0.82)_78%)]"} />
      )}

      <div className="absolute left-[max(.75rem,env(safe-area-inset-left))] right-[max(.75rem,env(safe-area-inset-right))] top-[max(.75rem,env(safe-area-inset-top))] flex items-start justify-between gap-2">
        <button type="button" disabled={!uiEnabled} onClick={(event) => { event.currentTarget.blur(); if (lobby) onLobbySetup?.(); else onPanelChange("tarefas") }}
          aria-label={lobby ? "Abrir preparação da sala" : `Abrir tarefas: ${spots.length} pendentes`} aria-expanded={panel === "tarefas"} title={lobby ? "Jogadores prontos. Abra a preparação." : "Progresso do time. Abra para ver suas tarefas."}
          className="pointer-events-auto w-36 min-w-0 cursor-pointer rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-left disabled:cursor-not-allowed sm:w-48">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-200"><ClipboardList className="size-4 shrink-0" /><span className="truncate">{lobby ? "Sala" : "Time"}</span><span className="ml-auto text-amber-200">{lobby ? `${readyPlayers}/${snapshot.players.length}` : `${snapshot.tasksDone}/${snapshot.tasksTotal}`}</span></span>
          {lobby ? <span className="mt-1.5 block text-[10px] text-zinc-400">Jogadores prontos</span> : <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-amber-300 transition-[width] duration-500" style={{ width: `${Math.round(progress * 100)}%` }} /></span>}
          {role && <span className={`mt-1.5 block truncate text-[10px] font-semibold ${ROLE_COPY[role].tone}`}>{alive ? ROLE_COPY[role].title : "Fantasma"}</span>}
        </button>
        <div className="pointer-events-auto flex gap-1.5">
          <button type="button" onPointerDown={(event) => { if (event.pointerType !== "mouse") event.preventDefault() }}
            onClick={(event) => { event.currentTarget.blur(); voice.toggle() }} disabled={voice.busy}
            className={`${TOOL_BUTTON} ${voice.enabled ? "border-emerald-400/40 text-emerald-300" : ""}`}
            aria-label={voice.enabled ? "Silenciar microfone" : "Ativar microfone"} aria-pressed={voice.configured && !voice.enabled}
            title={voice.enabled ? "Microfone ativo" : "Microfone silenciado"}>
            {voice.busy ? <LoaderCircle className="size-5 animate-spin" /> : voice.enabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          {!lobby && <button type="button" disabled={!uiEnabled} onClick={(event) => { event.currentTarget.blur(); onMapOpenChange(!mapOpen) }}
            className={TOOL_BUTTON} aria-label={mapOpen ? "Fechar a planta" : "Abrir a planta"} aria-expanded={mapOpen} title="Mapa (M)"><MapIcon className="size-5" /></button>}
          <button type="button" disabled={!uiEnabled} onClick={(event) => { event.currentTarget.blur(); onPanelChange("opcoes") }}
            className={TOOL_BUTTON} aria-label="Opções da partida" aria-expanded={panel === "opcoes"}><Settings2 className="size-5" /></button>
        </div>
      </div>

      <div className={`absolute left-1/2 w-[min(85vw,24rem)] -translate-x-1/2 space-y-1.5 ${lobby ? "top-[calc(env(safe-area-inset-top)+9.5rem)]" : "top-[calc(max(.75rem,env(safe-area-inset-top))+5rem)]"}`} aria-live="polite">
        {snapshot.blackout && <p className="text-center text-xs font-semibold text-red-300">{role === "assassino" && alive ? "Visão noturna ativa" : "Luz apagada"}</p>}
        {voice.error && <p className="rounded-lg bg-red-950/90 px-3 py-2 text-center text-xs text-red-200">Microfone indisponível. Veja as opções.</p>}
        {notices.slice(-1).map((notice) => <p key={notice.id} className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${notice.kind === "perigo" ? "border-red-500/30 bg-red-950/90 text-red-200" : notice.kind === "pista" ? "border-sky-400/30 bg-sky-950/90 text-sky-200" : "border-amber-400/30 bg-amber-950/90 text-amber-100"}`}>{notice.text}</p>)}
      </div>

      <fieldset disabled={!controlsEnabled} aria-label="Ações da partida"
        className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+9rem)] right-[max(.75rem,env(safe-area-inset-right))] flex max-h-[calc(100%-15rem)] w-40 flex-col items-stretch gap-1.5 overflow-y-auto overscroll-contain sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:w-48 group-has-[[data-touch-controls]]/hud:bottom-[calc(env(safe-area-inset-bottom)+9rem)] [@media(min-width:600px)_and_(max-height:500px)]:grid [@media(min-width:600px)_and_(max-height:500px)]:w-[min(30rem,calc(100%-10rem))] [@media(min-width:600px)_and_(max-height:500px)]:grid-cols-3">
        {role === "assassino" && alive && (
          <>
            {targets.kill && <ActionButton label={`Matar ${targets.kill.name}`} icon={<Skull />} tone="perigo" shortcut="Q"
              onClick={() => { if (!targets.kill) return; playGameSound("kill"); onSend("kill", { targetId: targets.kill.id }) }} />}
            {mine?.inVent ? <>
              {destinos.map((vent, indice) => <ActionButton key={vent.id} label={`Ir para ${roomName(vent.room)}`} icon={<Wind />} tone="neutro" small shortcut={String(indice + 1)}
                onClick={() => { playGameSound("vent"); onSend("vent", { ventId: vent.id }) }} />)}
              <ActionButton label="Sair do duto" icon={<X />} tone="neutro" small shortcut="V" onClick={() => { playGameSound("vent"); onSend("vent", { ventId: "" }) }} />
            </> : targets.vent && <ActionButton label="Entrar no duto" icon={<Wind />} tone="neutro" small shortcut="V"
              onClick={() => { playGameSound("vent"); onSend("vent", { ventId: targets.vent?.id }) }} />}
            <SabotageButton snapshot={snapshot} me={me} role={role} status={sabotageStatus} controlsEnabled={controlsEnabled} onSabotage={onSabotage} />
          </>
        )}
        {targets.corpse && alive && <ActionButton label={`Reportar ${targets.corpse.name}`} icon={<Search />} tone="alerta" shortcut="R"
          onClick={() => { playGameSound("action"); onSend("report", { corpseId: targets.corpse!.id }) }} />}
        {targets.emergency && alive && !targets.corpse && <EmergencyButton snapshot={snapshot} me={me} status={emergencyStatus} controlsEnabled={controlsEnabled} onEmergency={onEmergency} />}
        {targets.task && <ActionButton label="Fazer tarefa" icon={<Hand />} tone="principal" shortcut="E"
          onClick={() => { if (!targets.task) return; playGameSound("action"); onOpenTask(targets.task) }} />}
      </fieldset>

      <HudPanels panel={panel} mapOpen={mapOpen} onClose={() => { onMapOpenChange(false); onPanelChange(null) }}
        map={map} spots={spots} targetId={targets.task?.id} role={role} level={mine?.level ?? 0} poseRef={poseRef}
        quality={quality} onQuality={onQuality} touchControls={touchControls} onTouchControls={setTouchControls}
        voiceError={voice.error} onLeave={onLeave} />
      <TouchControls inputRef={inputRef} enabled={controlsEnabled && !mine?.inVent} forceVisible={touchControls} />
    </div>
  )
}

export function EmergencyButton({ snapshot, me, status, controlsEnabled, onEmergency }: {
  snapshot: Snapshot
  me: string
  status: EmergencyStatus | null
  controlsEnabled: boolean
  onEmergency: () => void
}) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    let timer: number | undefined
    const update = () => {
      const updatedNow = performance.now()
      const remaining = emergencyRemainingMs(status, updatedNow)
      const next = Math.ceil(remaining / 1000)
      setNow(updatedNow)
      if (Number.isFinite(remaining) && remaining > 0) {
        timer = window.setTimeout(update, Math.max(16, remaining - (next - 1) * 1000))
      }
    }
    update()
    return () => { if (timer !== undefined) window.clearTimeout(timer) }
  }, [status])

  const left = snapshot.players.find((player) => player.id === me)?.emergenciesLeft ?? 0
  const seconds = Math.ceil(emergencyRemainingMs(status, now) / 1000)
  const label = left <= 0 ? "Sem chamadas de emergência"
    : !status || status.readyAt !== snapshot.emergencyReadyAt ? "Sincronizando emergência"
      : seconds > 0 ? `Emergência · ${seconds}s`
        : `Reunião · ${left} ${left === 1 ? "restante" : "restantes"}`
  return (
    <ActionButton
      label={label}
      icon={<Siren className="h-6 w-6" />}
      tone="alerta"
      shortcut="R"
      disabled={!controlsEnabled || !canCallEmergency(snapshot, me, status, now)}
      onClick={onEmergency}
    />
  )
}

export function SabotageButton({ snapshot, me, role, status, controlsEnabled, onSabotage }: {
  snapshot: Snapshot
  me: string
  role: Role | null
  status: SabotageStatus | null
  controlsEnabled: boolean
  onSabotage: () => void
}) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    let timer: number | undefined
    const update = () => {
      const updatedNow = performance.now()
      const remaining = sabotageRemainingMs(status, updatedNow)
      const next = Math.ceil(remaining / 1000)
      setNow(updatedNow)
      if (Number.isFinite(remaining) && remaining > 0) {
        timer = window.setTimeout(update, Math.max(16, remaining - (next - 1) * 1000))
      }
    }
    update()
    return () => { if (timer !== undefined) window.clearTimeout(timer) }
  }, [status])

  const seconds = Math.ceil(sabotageRemainingMs(status, now) / 1000)
  const label = !status ? "Sincronizando"
    : seconds > 0 ? `Recarga · ${seconds}s`
      : snapshot.blackout ? "Luz apagada" : "Apagar a luz"
  return (
    <ActionButton
      label={label}
      icon={<AlertOctagon className="h-5 w-5" />}
      tone="neutro"
      small
      shortcut="F"
      disabled={!controlsEnabled || !canSabotage(snapshot, me, role, status, now)}
      onClick={onSabotage}
    />
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
    principal: "border-amber-400/50 bg-amber-950/90 text-amber-200 hover:bg-amber-950/95",
    perigo: "border-red-500/50 bg-red-950/90 text-red-200 hover:bg-red-950/95",
    alerta: "border-orange-400/50 bg-orange-950/90 text-orange-200 hover:bg-orange-950/95",
    neutro: "border-white/15 bg-zinc-950/85 text-zinc-300 hover:bg-zinc-900/95",
  }

  return (
    <button
      type="button"
      onPointerDown={(event) => { if (event.pointerType !== "mouse") event.preventDefault() }}
      onClick={(event) => { event.currentTarget.blur(); if (!disabled) onClick() }}
      disabled={disabled}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border px-3 transition disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-zinc-950/75 disabled:text-zinc-600 ${
        small ? "py-2" : "py-2.5"
      } ${tones[tone]}`}
    >
      <span className="shrink-0 [&>svg]:size-5">{icon}</span>
      <span className="line-clamp-2 min-w-0 break-words text-left text-xs font-semibold leading-tight">{label}</span>
      {shortcut && (
        <kbd className="ml-auto hidden rounded-md border border-current/20 bg-black/20 px-1.5 py-0.5 font-mono text-[9px] opacity-70 [@media(pointer:fine)]:block group-has-[[data-touch-controls]]/hud:hidden">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}
