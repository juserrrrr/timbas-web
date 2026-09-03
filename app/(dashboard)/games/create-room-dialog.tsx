"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { GameMapSummary } from "@/lib/services/games"

interface Props {
  open: boolean
  maps: GameMapSummary[]
  onOpenChange: (open: boolean) => void
  onConfirm: (input: { name: string; password: string; mapId: string }) => void
}

export function CreateRoomDialog({ open, maps, onOpenChange, onConfirm }: Props) {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [mapId, setMapId] = useState("original")

  useEffect(() => {
    if (!maps.some((map) => map.id === mapId)) setMapId(maps[0]?.id ?? "original")
  }, [mapId, maps])

  const confirm = () => {
    onConfirm({ name: name.trim() || "Sala do Timbas", password: password.trim(), mapId })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-tight">Criar sala</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Você entra como anfitrião e ajusta as regras antes de começar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
              Mapa da partida
            </span>
            <select
              value={mapId}
              onChange={(event) => setMapId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:outline-none"
            >
              {maps.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.name}{map.original ? " (original)" : ""}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-[11px] text-zinc-600">
              O mapa fica preso a esta sala, mesmo que outro seja editado depois.
            </span>
          </label>

          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
              Nome da sala
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 32))}
              placeholder="Jogatina de sexta"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
              Senha (opcional)
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value.slice(0, 24))}
              placeholder="Deixe vazio para sala aberta"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={confirm}
          className="mt-2 w-full cursor-pointer rounded-xl bg-amber-400 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300"
        >
          Criar sala
        </button>
      </DialogContent>
    </Dialog>
  )
}
