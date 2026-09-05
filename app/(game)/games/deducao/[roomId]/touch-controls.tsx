"use client"

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from "react"
import { ArrowUp, ChevronsUp, Footprints } from "lucide-react"
import { unlockGameAudio } from "@/lib/games/game-audio"
import type { InputState } from "./scene/office-scene"

interface Props {
  inputRef: MutableRefObject<InputState>
  enabled: boolean
  forceVisible?: boolean
}

const TOUCH_MEDIA = "(any-pointer: coarse), (pointer: coarse)"
const ACTIONS = [
  { key: "jump", label: "Pular", Icon: ArrowUp },
  { key: "crouch", label: "Agachar", Icon: Footprints },
  { key: "sprint", label: "Correr", Icon: ChevronsUp },
] as const

function release(element: HTMLElement, id: number) {
  if (element.hasPointerCapture(id)) element.releasePointerCapture(id)
}

// O grupo ocupa os 112px inferiores; o HUD pode reservá-los com :has([data-touch-controls]).
export function TouchControls({ inputRef, enabled, forceVisible = false }: Props) {
  const [coarse, setCoarse] = useState(false)
  const [modes, setModes] = useState({ crouch: false, sprint: false })
  const visible = forceVisible || coarse
  const stick = useRef<{ id: number; element: HTMLDivElement; x: number; y: number; radius: number } | null>(null)
  const knob = useRef<HTMLSpanElement | null>(null)
  const actionPointers = useRef(new Map<HTMLButtonElement, number>())
  const ownsInput = useRef(false)

  const reset = useCallback(() => {
    const active = stick.current
    stick.current = null
    const captures = [...actionPointers.current]
    actionPointers.current.clear()
    if (ownsInput.current) {
      Object.assign(inputRef.current, { x: 0, z: 0, sprint: false, crouch: false })
      ownsInput.current = false
    }
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)"
    setModes((current) => current.crouch || current.sprint ? { crouch: false, sprint: false } : current)
    if (active) release(active.element, active.id)
    for (const [element, id] of captures) release(element, id)
  }, [inputRef])

  useEffect(() => {
    const media = window.matchMedia(TOUCH_MEDIA)
    const update = () => { reset(); setCoarse(media.matches) }
    update()
    media.addEventListener("change", update)
    return () => { media.removeEventListener("change", update); reset() }
  }, [reset])

  useEffect(() => {
    if (!enabled || !visible) { reset(); return }
    const visibility = () => { if (document.hidden) reset() }
    window.addEventListener("blur", reset)
    document.addEventListener("visibilitychange", visibility)
    return () => {
      window.removeEventListener("blur", reset)
      document.removeEventListener("visibilitychange", visibility)
      reset()
    }
  }, [enabled, visible, reset])

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const active = stick.current
    if (!enabled || !active || active.id !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const dx = event.clientX - active.x
    const dy = event.clientY - active.y
    const distance = Math.hypot(dx, dy)
    const ratio = Math.min(1, distance / active.radius)
    const scale = distance > 0 ? Math.max(0, (ratio - 0.12) / 0.88) / distance : 0
    inputRef.current.x = dx * scale
    inputRef.current.z = dy * scale
    const limit = distance > active.radius ? active.radius / distance : 1
    if (knob.current) knob.current.style.transform = `translate(${dx * limit}px, ${dy * limit}px)`
  }

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || stick.current || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const bounds = event.currentTarget.getBoundingClientRect()
    stick.current = { id: event.pointerId, element: event.currentTarget,
      x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, radius: Math.max(1, bounds.width / 2 - 24) }
    ownsInput.current = true
    unlockGameAudio()
    move(event)
  }

  const end = (event: PointerEvent<HTMLDivElement>) => {
    const active = stick.current
    if (!active || active.id !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    stick.current = null
    inputRef.current.x = 0
    inputRef.current.z = 0
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)"
    release(active.element, active.id)
  }

  const activate = (key: typeof ACTIONS[number]["key"]) => {
    if (!enabled) return
    ownsInput.current = true
    unlockGameAudio()
    if (key === "jump") { inputRef.current.jumpSerial += 1; return }
    const active = !inputRef.current[key]
    const next = { crouch: key === "crouch" && active, sprint: key === "sprint" && active }
    Object.assign(inputRef.current, next)
    setModes(next)
  }

  const actionStart = (event: PointerEvent<HTMLButtonElement>, key: typeof ACTIONS[number]["key"]) => {
    if (!enabled || event.button !== 0 || actionPointers.current.has(event.currentTarget)) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    actionPointers.current.set(event.currentTarget, event.pointerId)
    activate(key)
  }

  const actionEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (actionPointers.current.get(event.currentTarget) !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    actionPointers.current.delete(event.currentTarget)
    release(event.currentTarget, event.pointerId)
  }

  if (!visible) return null
  return (
    <div data-touch-controls aria-label="Controles de toque" className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] h-28 select-none">
      <div
        role="group" aria-label="Manche de movimento" aria-disabled={!enabled}
        className="pointer-events-auto absolute bottom-0 left-[max(0.75rem,env(safe-area-inset-left))] flex h-28 w-28 touch-none items-center justify-center rounded-full border border-white/25 bg-zinc-950/80 shadow-lg aria-disabled:opacity-35"
        onPointerDown={start} onPointerMove={move} onPointerUp={end}
        onPointerCancel={(event) => { if (stick.current?.id === event.pointerId) reset() }}
        onLostPointerCapture={(event) => { if (stick.current?.id === event.pointerId) reset() }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="absolute top-2 text-[8px] font-bold uppercase tracking-widest text-zinc-400">Mover</span>
        <span ref={knob} aria-hidden className="pointer-events-none h-12 w-12 rounded-full border border-amber-200/50 bg-amber-400/65 shadow-md" />
      </div>
      <div className="pointer-events-auto absolute bottom-0 right-[max(0.75rem,env(safe-area-inset-right))] flex gap-1.5" role="group" aria-label="Movimentos do personagem">
        {ACTIONS.map(({ key, label, Icon }) => (
          <button key={key} type="button" disabled={!enabled} aria-label={label}
            aria-pressed={key === "jump" ? undefined : modes[key]} data-active={key === "jump" ? undefined : modes[key]}
            className="flex h-14 w-12 touch-none flex-col items-center justify-center gap-1 rounded-2xl border border-white/25 bg-zinc-950/90 text-zinc-200 shadow-lg data-[active=true]:border-amber-300/70 data-[active=true]:bg-amber-950/95 data-[active=true]:text-amber-200 disabled:opacity-35"
            onPointerDown={(event) => actionStart(event, key)} onPointerUp={actionEnd}
            onPointerCancel={(event) => { if (actionPointers.current.get(event.currentTarget) === event.pointerId) reset() }}
            onLostPointerCapture={(event) => { if (actionPointers.current.get(event.currentTarget) === event.pointerId) reset() }}
            onClick={(event) => { if (event.detail === 0) activate(key) }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="text-[9px] font-bold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
