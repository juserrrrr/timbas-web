"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import type { MapTaskSpot } from "@/lib/services/games"

interface Props {
  spot: MapTaskSpot
  onDone: () => void
  onCancel: () => void
}

const WIRE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"]

export function TaskOverlay({ spot, onDone, onCancel }: Props) {
  const game = KIND_TO_GAME[spot.kind] ?? "barra"

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.09] bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/70">
              Tarefa em andamento
            </p>
            <h2 className="mt-1.5 text-lg font-black leading-tight text-white">{spot.label}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:text-white"
            aria-label="Largar a tarefa"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          {game === "cabos" && <WireGame onDone={onDone} />}
          {game === "senha" && <KeypadGame onDone={onDone} />}
          {game === "ordem" && <OrderGame onDone={onDone} />}
          {game === "barra" && <BarGame onDone={onDone} />}
        </div>
      </div>
    </div>
  )
}

const KIND_TO_GAME: Record<string, "cabos" | "senha" | "ordem" | "barra"> = {
  cabos: "cabos",
  senha: "senha",
  arquivo: "ordem",
  cafe: "ordem",
  estoque: "ordem",
  rack: "barra",
  impressora: "barra",
}

function WireGame({ onDone }: { onDone: () => void }) {
  const right = useMemo(() => [...WIRE_COLORS].sort(() => Math.random() - 0.5), [])
  const [picked, setPicked] = useState<string | null>(null)
  const [linked, setLinked] = useState<string[]>([])

  useEffect(() => {
    if (linked.length === WIRE_COLORS.length) onDone()
  }, [linked.length, onDone])

  return (
    <div>
      <p className="text-xs text-zinc-500">Ligue cada cabo na ponta da mesma cor.</p>
      <div className="mt-4 flex items-center justify-between gap-8">
        <div className="flex flex-col gap-3">
          {WIRE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={linked.includes(color)}
              onClick={() => setPicked(color)}
              className={`h-10 w-24 cursor-pointer rounded-l-md transition disabled:opacity-25 ${picked === color ? "ring-2 ring-white" : ""}`}
              style={{ backgroundColor: color }}
              aria-label={`Cabo ${color}`}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {right.map((color) => (
            <button
              key={color}
              type="button"
              disabled={linked.includes(color)}
              onClick={() => {
                if (picked === color) setLinked((current) => [...current, color])
                setPicked(null)
              }}
              className="h-10 w-24 cursor-pointer rounded-r-md transition disabled:opacity-25"
              style={{ backgroundColor: color }}
              aria-label={`Ponta ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function KeypadGame({ onDone }: { onDone: () => void }) {
  const code = useMemo(() => String(Math.floor(1000 + Math.random() * 9000)), [])
  const [typed, setTyped] = useState("")

  useEffect(() => {
    if (typed === code) onDone()
    else if (typed.length >= code.length) setTyped("")
  }, [typed, code, onDone])

  return (
    <div>
      <p className="text-xs text-zinc-500">Digite a senha que apareceu na tela.</p>
      <p className="mt-3 text-center font-mono text-4xl font-black tracking-[0.4em] text-amber-300">{code}</p>
      <p className="mt-2 text-center font-mono text-2xl tracking-[0.4em] text-zinc-600">{typed.padEnd(4, "·")}</p>
      <div className="mx-auto mt-5 grid max-w-56 grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""].map((key, index) => (
          <button
            key={`${key}-${index}`}
            type="button"
            disabled={!key}
            onClick={() => setTyped((current) => current + key)}
            className="h-12 cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.03] font-mono text-lg font-bold text-white transition hover:border-amber-400/40 disabled:cursor-default disabled:border-transparent disabled:bg-transparent"
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderGame({ onDone }: { onDone: () => void }) {
  const items = useMemo(
    () => [1, 2, 3, 4, 5].map((value) => ({ value, left: Math.random() * 76, top: Math.random() * 68 })),
    [],
  )
  const [next, setNext] = useState(1)

  useEffect(() => {
    if (next > items.length) onDone()
  }, [next, items.length, onDone])

  return (
    <div>
      <p className="text-xs text-zinc-500">Clique na ordem, do 1 ao 5.</p>
      <div className="relative mt-4 h-52 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={item.value < next}
            onClick={() => item.value === next && setNext((current) => current + 1)}
            className="absolute flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 font-mono text-base font-black text-amber-200 transition hover:bg-amber-400/25 disabled:border-emerald-400/30 disabled:bg-emerald-400/10 disabled:text-emerald-300"
            style={{ left: `${item.left}%`, top: `${item.top}%` }}
          >
            {item.value}
          </button>
        ))}
      </div>
    </div>
  )
}

function BarGame({ onDone }: { onDone: () => void }) {
  const [position, setPosition] = useState(0)
  const [hits, setHits] = useState(0)
  const [missed, setMissed] = useState(false)
  const direction = useRef(1)

  useEffect(() => {
    const timer = setInterval(() => {
      setPosition((current) => {
        const next = current + direction.current * 2.6
        if (next >= 100 || next <= 0) direction.current *= -1
        return Math.min(100, Math.max(0, next))
      })
    }, 16)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (hits >= 3) onDone()
  }, [hits, onDone])

  const stop = () => {
    if (position > 42 && position < 58) {
      setHits((current) => current + 1)
      setMissed(false)
    } else {
      setMissed(true)
    }
  }

  return (
    <div>
      <p className="text-xs text-zinc-500">Pare o cursor no verde três vezes.</p>
      <div className="relative mt-5 h-8 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.03]">
        <span className="absolute inset-y-0 left-[42%] w-[16%] bg-emerald-400/25" />
        <span
          className="absolute inset-y-1 w-1.5 rounded-full bg-amber-300"
          style={{ left: `calc(${position}% - 3px)` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
          {hits}/3 {missed && <span className="text-red-400">errou</span>}
        </span>
        <button
          type="button"
          onClick={stop}
          className="cursor-pointer rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300"
        >
          Travar
        </button>
      </div>
    </div>
  )
}
