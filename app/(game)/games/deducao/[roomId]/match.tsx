"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { playGameSound, unlockGameAudio } from "@/lib/games/game-audio"
import type { MapTaskSpot, OfficeMap } from "@/lib/services/games"
import { EndScreen } from "./end-screen"
import { Hud } from "./hud"
import { NO_TARGETS, type Quality, type Targets } from "./match-types"
import { Meeting } from "./meeting"
import { TaskOverlay } from "./minigames"
import { OfficeScene, type InputState } from "./scene/office-scene"
import type { Notice, Role, Snapshot } from "./use-deducao-room"

interface Props {
  map: OfficeMap
  snapshot: Snapshot
  roomRef: React.MutableRefObject<any>
  me: string
  role: Role | null
  allies: string[]
  myTasks: string[]
  finalRoles: Record<string, string>
  notices: Notice[]
  onSend: (type: string, payload?: unknown) => void
  onLeave: () => void
}

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

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

/// A escolha automática de qualidade. Não dá para perguntar isso para quem só
/// quer jogar, então a tela chuta pelo aparelho e deixa trocar depois no HUD.
function guessQuality(): Quality {
  if (typeof window === "undefined") return "medio"
  const cores = navigator.hardwareConcurrency ?? 4
  const touch = window.matchMedia("(pointer: coarse)").matches
  if (touch || cores <= 4) return "baixo"
  return cores >= 8 ? "alto" : "medio"
}

export function Match({
  map,
  snapshot,
  roomRef,
  me,
  role,
  allies,
  myTasks,
  finalRoles,
  notices,
  onSend,
  onLeave,
}: Props) {
  const inputRef = useRef<InputState>({ x: 0, z: 0 })
  const pressed = useRef(new Set<string>())
  const [targets, setTargets] = useState<Targets>(NO_TARGETS)
  const [openTask, setOpenTask] = useState<MapTaskSpot | null>(null)
  const [quality, setQuality] = useState<Quality>("medio")
  const [intro, setIntro] = useState(false)
  const [doneTasks, setDoneTasks] = useState<string[]>([])
  const previousBlackout = useRef(snapshot.blackout)
  const previousPhase = useRef(snapshot.phase)
  const previousAlive = useRef(snapshot.players.find((player) => player.id === me)?.alive ?? true)
  const actions = useRef({ snapshot, targets, role, openTask, onSend })
  actions.current = { snapshot, targets, role, openTask, onSend }

  useEffect(() => setQuality(guessQuality()), [])

  useEffect(() => {
    if (snapshot.blackout && !previousBlackout.current) playGameSound("blackout")
    previousBlackout.current = snapshot.blackout
  }, [snapshot.blackout])

  useEffect(() => {
    if (
      snapshot.phase !== previousPhase.current &&
      (snapshot.phase === "reuniao" || snapshot.phase === "votacao")
    ) {
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
    if (snapshot.phase !== "jogando") return
    setIntro(true)
    const timer = setTimeout(() => setIntro(false), 4500)
    return () => clearTimeout(timer)
  }, [snapshot.phase])

  useEffect(() => setDoneTasks([]), [myTasks])

  useEffect(() => {
    const apply = () => {
      let x = 0
      let z = 0
      pressed.current.forEach((code) => {
        const move = KEYS[code]
        if (!move) return
        x += move[0]
        z += move[1]
      })
      inputRef.current = { x, z }
    }

    const down = (event: KeyboardEvent) => {
      const typing = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA"
      if (typing) return
      unlockGameAudio()

      if (KEYS[event.code]) {
        event.preventDefault()
        pressed.current.add(event.code)
        apply()
        return
      }

      if (event.repeat) return
      const current = actions.current
      const mine = current.snapshot.players.find((player) => player.id === me)
      const alive = mine?.alive ?? false
      if (current.snapshot.phase !== "jogando" || current.openTask) return

      if (event.code === "KeyE" && current.targets.task) {
        event.preventDefault()
        playGameSound("action")
        current.onSend("task:begin", { spotId: current.targets.task.id })
        setOpenTask(current.targets.task)
      } else if (event.code === "KeyQ" && current.role === "assassino" && alive && current.targets.kill) {
        event.preventDefault()
        playGameSound("kill")
        current.onSend("kill", { targetId: current.targets.kill.id })
      } else if (event.code === "KeyV" && current.role === "assassino" && alive) {
        const ventId = mine?.inVent ? "" : current.targets.vent?.id
        if (ventId !== undefined) {
          event.preventDefault()
          playGameSound("vent")
          current.onSend("vent", { ventId })
        }
      } else if (event.code === "KeyF" && current.role === "assassino" && alive) {
        event.preventDefault()
        playGameSound("action")
        current.onSend("sabotage")
      } else if (event.code === "KeyR" && alive && current.targets.corpse) {
        event.preventDefault()
        playGameSound("action")
        current.onSend("report", { corpseId: current.targets.corpse.id })
      } else if (event.code === "KeyR" && alive && current.targets.emergency && (mine?.emergenciesLeft ?? 0) > 0) {
        event.preventDefault()
        playGameSound("action")
        current.onSend("emergency")
      }
    }
    const up = (event: KeyboardEvent) => {
      pressed.current.delete(event.code)
      apply()
    }
    // Trocar de aba com a tecla apertada deixava o boneco andando sozinho.
    const blur = () => {
      pressed.current.clear()
      apply()
    }

    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", blur)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", blur)
    }
  }, [me])

  // A tarefa aberta fecha sozinha quando a reunião começa: ninguém termina o
  // cabeamento no meio de uma discussão.
  useEffect(() => {
    if (snapshot.phase !== "jogando") setOpenTask(null)
  }, [snapshot.phase])

  // O servidor sabe quais tarefas já foram, mas não manda a lista de volta para
  // não entregar de graça quem está trabalhando. Quem risca da lista é a própria
  // tela, no momento em que o minigame fecha.
  const pendingTasks = useMemo(() => myTasks.filter((id) => !doneTasks.includes(id)), [myTasks, doneTasks])

  const inMeeting = snapshot.phase === "reuniao" || snapshot.phase === "votacao"

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <OfficeScene
        map={map}
        snapshot={snapshot}
        roomRef={roomRef}
        me={me}
        role={role}
        allies={allies}
        pendingTasks={pendingTasks}
        quality={quality}
        inputRef={inputRef}
        onTargets={setTargets}
      />

      <Hud
        snapshot={snapshot}
        map={map}
        me={me}
        role={role}
        pendingTasks={pendingTasks}
        targets={targets}
        notices={notices}
        quality={quality}
        onQuality={setQuality}
        onSend={onSend}
        onOpenTask={(spot) => {
          onSend("task:begin", { spotId: spot.id })
          setOpenTask(spot)
        }}
        onLeave={onLeave}
        inputRef={inputRef}
      />

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

      {inMeeting && <Meeting snapshot={snapshot} me={me} role={role} onSend={onSend} />}

      {snapshot.phase === "fim" && (
        <EndScreen snapshot={snapshot} me={me} roles={finalRoles} onSend={onSend} onLeave={onLeave} />
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
