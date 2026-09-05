"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { playGameSound, unlockGameAudio } from "@/lib/games/game-audio"
import type { MapTaskSpot, OfficeMap } from "@/lib/services/games"
import { EndScreen } from "./end-screen"
import { canCallEmergency, type EmergencyStatus } from "./emergency-cooldown"
import { Hud } from "./hud"
import type { HudPanel } from "./hud-panels"
import { gameKeyCode, isGameControlTarget } from "./keyboard-controls"
import { NO_TARGETS, type LookState, type Quality, type Targets } from "./match-types"
import { Meeting } from "./meeting"
import { TaskOverlay } from "./minigames"
import { canSabotage, type SabotageStatus } from "./sabotage-cooldown"
import { OfficeScene, type InputState } from "./scene/office-scene"
import type { Notice, Role, Snapshot } from "./use-deducao-room"
import type { VoiceControls } from "./use-proximity-voice"

interface Props {
  map: OfficeMap
  lobby?: boolean
  lobbyControlsEnabled?: boolean
  onLobbySetup?: () => void
  snapshot: Snapshot
  roomRef: React.MutableRefObject<any>
  poseRef: React.MutableRefObject<{ x: number; z: number; dir: number }>
  voice: VoiceControls
  me: string
  role: Role | null
  sabotageStatus: SabotageStatus | null
  emergencyStatus: EmergencyStatus | null
  allies: string[]
  myTasks: string[]
  finalRoles: Record<string, string>
  notices: Notice[]
  onSend: (type: string, payload?: unknown) => void
  onLeave: () => void
}

const MOVEMENT_KEYS = new Set(["KeyW", "ArrowUp", "KeyS", "ArrowDown", "KeyA", "ArrowLeft", "KeyD", "ArrowRight"])
const SPRINT_KEYS = new Set(["ShiftLeft", "ShiftRight"])
const CROUCH_KEYS = new Set(["ControlLeft", "ControlRight", "KeyC"])

const ROLE_INTRO: Record<Role, { title: string; line: string; tone: string }> = {
  assassino: {
    title: "Você é o assassino",
    line: "Faça tarefas como todo mundo, mate quando ninguém estiver olhando e use os dutos para sumir.",
    tone: "text-red-400",
  },
  detetive: {
    title: "Você é o detetive",
    line: "Na reunião, escolha alguém para investigar. O resultado sai na reunião seguinte.",
    tone: "text-sky-300",
  },
  funcionario: {
    title: "Você é funcionário",
    line: "Termine suas tarefas e preste atenção em quem some do mapa.",
    tone: "text-emerald-300",
  },
}

/// Leve é o padrão. A escolha manual fica guardada, e trocar recria a cena para
/// que antialias, sombras e pós-processamento nunca compartilhem recursos velhos.
const QUALITY_KEY = "timbas.deducao.graphics-quality"

function initialQuality(): Quality {
  try {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(QUALITY_KEY)
      if (saved === "alto" || saved === "medio" || saved === "baixo") return saved
    }
  } catch {
    // Leve continua disponível quando o navegador bloqueia armazenamento.
  }
  return "baixo"
}

export function Match({
  map,
  lobby = false,
  lobbyControlsEnabled = false,
  onLobbySetup,
  snapshot,
  roomRef,
  poseRef,
  voice,
  me,
  role,
  sabotageStatus,
  emergencyStatus,
  allies,
  myTasks,
  finalRoles,
  notices,
  onSend,
  onLeave,
}: Props) {
  const inputRef = useRef<InputState>({ x: 0, z: 0, sprint: false, crouch: false, jumpSerial: 0 })
  // Olhar e posição vivem fora do React: mudam em todo quadro, e passar isso
  // por estado redesenharia o HUD sessenta vezes por segundo.
  const lookRef = useRef<LookState>({ yaw: 0, pitch: 0 })
  const pressed = useRef(new Set<string>())
  const [targets, setTargets] = useState<Targets>(NO_TARGETS)
  const [openTask, setOpenTask] = useState<MapTaskSpot | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [hudPanel, setHudPanel] = useState<HudPanel>(null)
  const [quality, setQuality] = useState<Quality>(initialQuality)
  const [intro, setIntro] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [doneTasks, setDoneTasks] = useState<string[]>([])
  const previousBlackout = useRef(snapshot.blackout)
  const previousPhase = useRef(snapshot.phase)
  const previousAlive = useRef(snapshot.players.find((player) => player.id === me)?.alive ?? true)
  const controlsEnabled = sceneReady && (snapshot.phase === "jogando" || (lobby && snapshot.phase === "lobby" && lobbyControlsEnabled)) && !openTask && !intro && !mapOpen && !hudPanel
  const actions = useRef({ snapshot, targets, role, sabotageStatus, emergencyStatus, onSend, controlsEnabled })
  actions.current = { snapshot, targets, role, sabotageStatus, emergencyStatus, onSend, controlsEnabled }
  const requestEmergency = useCallback(() => {
    const current = actions.current
    if (!current.controlsEnabled || !current.targets.emergency
      || !canCallEmergency(current.snapshot, me, current.emergencyStatus)) return
    playGameSound("action")
    current.onSend("emergency")
  }, [me])
  const requestSabotage = useCallback(() => {
    const current = actions.current
    if (!current.controlsEnabled || !canSabotage(current.snapshot, me, current.role, current.sabotageStatus)) return
    playGameSound("action")
    current.onSend("sabotage")
  }, [me])
  const markSceneReady = useCallback(() => setSceneReady(true), [])
  const resetInput = useCallback(() => {
    pressed.current.clear()
    inputRef.current = { x: 0, z: 0, sprint: false, crouch: false, jumpSerial: inputRef.current.jumpSerial }
  }, [])
  const changeMapOpen = useCallback((open: boolean) => {
    setHudPanel(null)
    setMapOpen(open)
  }, [])
  const changeHudPanel = useCallback((panel: HudPanel) => {
    setMapOpen(false)
    setHudPanel(panel)
  }, [])

  useEffect(() => {
    resetInput()
    setTargets(NO_TARGETS)
    setSceneReady(false)
  }, [lobby, resetInput])

  useEffect(() => {
    if (lobby && !lobbyControlsEnabled) {
      setMapOpen(false)
      setHudPanel(null)
    }
  }, [lobby, lobbyControlsEnabled])

  const chooseQuality = (next: Quality) => {
    try {
      window.localStorage.setItem(QUALITY_KEY, next)
    } catch {
      // A troca vale para esta partida mesmo sem persistência.
    }
    if (next === quality) return
    resetInput()
    setTargets(NO_TARGETS)
    setSceneReady(false)
    setQuality(next)
  }

  useEffect(() => {
    if (snapshot.blackout && !previousBlackout.current) playGameSound("blackout")
    previousBlackout.current = snapshot.blackout
  }, [snapshot.blackout])

  useEffect(() => {
    if (snapshot.phase !== previousPhase.current && (snapshot.phase === "reuniao" || snapshot.phase === "votacao")) {
      playGameSound("meeting")
    }
    previousPhase.current = snapshot.phase
  }, [snapshot.phase])

  useEffect(() => {
    const alive = snapshot.players.find((player) => player.id === me)?.alive ?? true
    if (!alive && previousAlive.current) playGameSound("kill")
    previousAlive.current = alive
  }, [snapshot.players, me])

  // A carta do papel entra na virada para a partida, não na chegada da
  // mensagem: numa segunda partida o papel pode ser o mesmo e o efeito não
  // dispararia de novo.
  useEffect(() => {
    if (snapshot.phase !== "jogando" || !role) {
      setIntro(false)
      return
    }
    resetInput()
    setIntro(true)
  }, [snapshot.phase, role, resetInput])

  useEffect(() => {
    if (!sceneReady || snapshot.phase !== "jogando" || !role) return
    const timer = window.setTimeout(() => setIntro(false), 5200)
    return () => window.clearTimeout(timer)
  }, [role, sceneReady, snapshot.phase])

  useEffect(() => setDoneTasks([]), [myTasks])

  useEffect(() => {
    if (!controlsEnabled) resetInput()
  }, [controlsEnabled, resetInput])

  useEffect(() => {
    const apply = () => {
      const keys = pressed.current
      const x = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"))
      const z = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"))
      const length = Math.max(1, Math.hypot(x, z))
      inputRef.current = {
        x: x / length,
        z: z / length,
        sprint: pressed.current.has("ShiftLeft") || pressed.current.has("ShiftRight"),
        crouch: pressed.current.has("ControlLeft") || pressed.current.has("ControlRight") || pressed.current.has("KeyC"),
        jumpSerial: inputRef.current.jumpSerial,
      }
    }

    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.metaKey) return
      if (isGameControlTarget(event.target) || isGameControlTarget(document.activeElement)) {
        resetInput()
        return
      }
      const current = actions.current
      if (!current.controlsEnabled) return
      const code = gameKeyCode(event)
      unlockGameAudio()

      if (MOVEMENT_KEYS.has(code) || SPRINT_KEYS.has(code) || CROUCH_KEYS.has(code)) {
        event.preventDefault()
        if (event.repeat) return
        pressed.current.add(code)
        apply()
        return
      }

      if (code === "Space") {
        event.preventDefault()
        if (event.repeat) return
        inputRef.current = { ...inputRef.current, jumpSerial: inputRef.current.jumpSerial + 1 }
        return
      }

      if (event.repeat) return
      if (current.snapshot.phase !== "jogando") return
      const mine = current.snapshot.players.find((player) => player.id === me)
      const alive = mine?.alive ?? false

      if (code === "KeyE" && current.targets.task) {
        event.preventDefault()
        resetInput()
        playGameSound("action")
        current.onSend("task:begin", { spotId: current.targets.task.id })
        setOpenTask(current.targets.task)
      } else if (code === "KeyQ" && current.role === "assassino" && alive && current.targets.kill) {
        event.preventDefault()
        playGameSound("kill")
        current.onSend("kill", { targetId: current.targets.kill.id })
      } else if (code === "KeyV" && current.role === "assassino" && alive) {
        const ventId = mine?.inVent ? "" : current.targets.vent?.id
        if (ventId !== undefined) {
          event.preventDefault()
          playGameSound("vent")
          current.onSend("vent", { ventId })
        }
      } else if (
        // Viajar de duto pelo teclado importa mais do que parece: em primeira
        // pessoa o ponteiro fica travado na tela, e sair da trava para clicar
        // num botão no meio da fuga custa a fuga.
        mine?.inVent &&
        current.role === "assassino" &&
        alive &&
        (code === "Digit1" || code === "Digit2")
      ) {
        const destino = current.targets.vent?.links[code === "Digit1" ? 0 : 1]
        if (destino) {
          event.preventDefault()
          playGameSound("vent")
          current.onSend("vent", { ventId: destino })
        }
      } else if (code === "KeyF" && current.role === "assassino" && alive) {
        event.preventDefault()
        requestSabotage()
      } else if (code === "KeyR" && alive && current.targets.corpse) {
        event.preventDefault()
        playGameSound("action")
        current.onSend("report", { corpseId: current.targets.corpse.id })
      } else if (code === "KeyR" && alive && current.targets.emergency) {
        event.preventDefault()
        requestEmergency()
      }
    }
    const up = (event: KeyboardEvent) => {
      if (pressed.current.delete(gameKeyCode(event))) apply()
    }
    const visibility = () => {
      if (document.hidden) resetInput()
    }
    const focus = (event: FocusEvent) => {
      if (isGameControlTarget(event.target)) resetInput()
    }
    const pointerLock = () => {
      if (!document.pointerLockElement) resetInput()
    }

    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", resetInput)
    document.addEventListener("visibilitychange", visibility)
    document.addEventListener("focusin", focus)
    document.addEventListener("pointerlockchange", pointerLock)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", resetInput)
      document.removeEventListener("visibilitychange", visibility)
      document.removeEventListener("focusin", focus)
      document.removeEventListener("pointerlockchange", pointerLock)
      resetInput()
    }
  }, [me, resetInput, requestSabotage, requestEmergency])

  // A tarefa aberta fecha sozinha quando a reunião começa: ninguém termina o
  // cabeamento no meio de uma discussão.
  useEffect(() => {
    if (snapshot.phase !== "jogando") {
      setOpenTask(null)
      setMapOpen(false)
      setHudPanel(null)
    }
  }, [snapshot.phase])

  // O servidor sabe quais tarefas já foram, mas não manda a lista de volta para
  // não entregar de graça quem está trabalhando. Quem risca da lista é a própria
  // tela, no momento em que o minigame fecha.
  const pendingTasks = useMemo(() => lobby ? [] : myTasks.filter((id) => !doneTasks.includes(id)), [lobby, myTasks, doneTasks])

  const inMeeting = snapshot.phase === "reuniao" || snapshot.phase === "votacao"

  return (
    <div className="relative h-full w-full overflow-hidden overscroll-none bg-black">
      <OfficeScene
        key={`office-${quality}-${lobby ? "lobby" : "match"}`}
        map={map}
        lobby={lobby}
        snapshot={snapshot}
        roomRef={roomRef}
        me={me}
        role={lobby ? null : role}
        allies={lobby ? [] : allies}
        pendingTasks={pendingTasks}
        quality={quality}
        inputRef={inputRef}
        controlsEnabled={controlsEnabled}
        lookRef={lookRef}
        poseRef={poseRef}
        onTargets={setTargets}
        onReady={markSceneReady}
      />

      <Hud
        snapshot={snapshot}
        map={map}
        me={me}
        role={lobby ? null : role}
        lobby={lobby}
        onLobbySetup={onLobbySetup}
        sabotageStatus={sabotageStatus}
        onSabotage={requestSabotage}
        emergencyStatus={emergencyStatus}
        onEmergency={requestEmergency}
        pendingTasks={pendingTasks}
        targets={lobby ? NO_TARGETS : targets}
        notices={notices}
        quality={quality}
        onQuality={chooseQuality}
        poseRef={poseRef}
        onSend={onSend}
        onOpenTask={(spot) => {
          if (!controlsEnabled || snapshot.phase !== "jogando") return
          resetInput()
          onSend("task:begin", { spotId: spot.id })
          setOpenTask(spot)
        }}
        onLeave={onLeave}
        inputRef={inputRef}
        controlsEnabled={controlsEnabled}
        mapOpen={mapOpen}
        onMapOpenChange={changeMapOpen}
        panel={hudPanel}
        onPanelChange={changeHudPanel}
        voice={voice}
      />

      {!sceneReady && <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status">
        <p className="flex items-center gap-2 rounded-xl bg-zinc-950/90 px-4 py-3 text-sm text-zinc-200"><LoaderCircle className="size-4 animate-spin" />Preparando ambiente...</p>
      </div>}

      {openTask && (
        <TaskOverlay
          spot={openTask}
          onDone={() => {
            onSend("task:done", { spotId: openTask.id })
            playGameSound("task")
            setDoneTasks((current) => [...current, openTask.id])
            setOpenTask(null)
          }}
          onCancel={() => setOpenTask(null)}
        />
      )}

      {inMeeting && <Meeting snapshot={snapshot} me={me} role={role} voice={voice} onSend={onSend} />}

      {snapshot.phase === "fim" && (
        <EndScreen snapshot={snapshot} me={me} roles={finalRoles} voice={voice} onSend={onSend} onLeave={onLeave} />
      )}

      {intro && role && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/80">
          <div className="px-8 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">Seu papel</p>
            <h2
              className={`font-display mt-4 text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl ${ROLE_INTRO[role].tone}`}
            >
              {ROLE_INTRO[role].title}
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">{ROLE_INTRO[role].line}</p>
          </div>
        </div>
      )}
    </div>
  )
}
