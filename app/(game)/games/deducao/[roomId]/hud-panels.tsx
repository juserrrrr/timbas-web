"use client"

import { LogOut, X } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { MapTaskSpot, OfficeMap } from "@/lib/services/games"
import type { Quality } from "./match-types"
import { Minimap } from "./minimap"
import type { Role } from "./use-deducao-room"

export type HudPanel = "tarefas" | "opcoes" | null

const KEYBOARD_HELP = [
  ["WASD / ↑↓←→", "Mover"], ["Shift", "Correr"], ["Espaço", "Pular"],
  ["C / Ctrl", "Agachar"], ["E", "Tarefa"], ["M", "Mapa"], ["Esc", "Soltar mouse / fechar"],
]

interface Props {
  panel: HudPanel
  mapOpen: boolean
  onClose: () => void
  map: OfficeMap
  spots: MapTaskSpot[]
  targetId?: string
  role: Role | null
  level: number
  poseRef: React.MutableRefObject<{ x: number; z: number; dir: number }>
  quality: Quality
  onQuality: (quality: Quality) => void
  touchControls: boolean
  onTouchControls: (enabled: boolean) => void
  voiceError: string | null
  onLeave: () => void
}

export function HudPanels({ panel, mapOpen, onClose, map, spots, targetId, role, level, poseRef,
  quality, onQuality, touchControls, onTouchControls, voiceError, onLeave }: Props) {
  const title = mapOpen ? "Planta do mapa" : panel === "tarefas" ? "Suas tarefas" : "Opções da partida"
  return (
    <Dialog open={mapOpen || panel !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={(event) => {
        event.preventDefault()
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      }} className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border-white/15 bg-zinc-950 p-4 text-zinc-200 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose aria-label="Voltar ao jogo" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/15 hover:bg-white/10"><X className="size-5" /></DialogClose>
        </div>
        <DialogDescription>
          {mapOpen ? map.name : panel === "tarefas" ? "Conclua as tarefas para ajudar seu time." : "Estas opções mudam só no seu aparelho. A partida continua acontecendo."}
        </DialogDescription>
        {mapOpen ? (
          <>
            <Minimap map={map} spots={spots} role={role} poseRef={poseRef} level={level} grande />
            <p className="text-xs text-zinc-400">Amarelo: suas tarefas. Vermelho: botão de emergência.</p>
          </>
        ) : panel === "tarefas" ? (
          <ul className="space-y-2">
            {spots.length === 0 && <li className="py-4 text-sm text-emerald-300">Suas tarefas acabaram.</li>}
            {spots.map((spot) => (
              <li key={spot.id} className={`rounded-xl border p-3 text-sm ${targetId === spot.id ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5"}`}>
                <p className="font-semibold">{spot.label}</p>
                <p className="mt-1 text-xs text-zinc-400">{map.rooms.find((room) => room.id === spot.room)?.name ?? spot.room} · {(spot.level ?? 0) === 1 ? "2º andar" : "Térreo"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <label className="space-y-2 text-sm font-semibold">
              <span>Qualidade gráfica</span>
              <select value={quality} onChange={(event) => onQuality(event.target.value as Quality)} aria-label="Qualidade gráfica" className="block min-h-11 w-full rounded-xl border border-white/15 bg-zinc-900 px-3 text-sm">
                <option value="baixo">Leve</option><option value="medio">Média</option><option value="alto">Alta</option>
              </select>
              <span className="block text-xs font-normal text-zinc-400">Sua escolha fica salva neste navegador.</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 p-3 text-sm">
              <span>Mostrar controles de toque<span className="mt-1 block text-xs text-zinc-400">Também aparecem automaticamente em telas de toque.</span></span>
              <input type="checkbox" checked={touchControls} onChange={(event) => onTouchControls(event.target.checked)} className="size-5 shrink-0 accent-amber-400" />
            </label>
            <p className="text-sm leading-relaxed text-zinc-400">No celular, use o direcional à esquerda e arraste a área livre à direita para olhar. Toque em Pular; Correr e Agachar ligam e desligam com um toque.</p>
            <details className="rounded-xl border border-white/10 p-3">
              <summary className="cursor-pointer text-sm font-semibold">Controles do teclado</summary>
              <dl className="mt-3 space-y-2">{KEYBOARD_HELP.map(([keys, label]) => <div key={keys} className="flex justify-between gap-3 text-xs"><dt>{label}</dt><dd><kbd className="rounded bg-white/10 px-2 py-1 font-mono">{keys}</kbd></dd></div>)}</dl>
            </details>
            {voiceError && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-950/60 p-3 text-sm text-red-200">{voiceError}</p>}
            <button type="button" onClick={onLeave} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/25 px-4 text-sm font-semibold text-red-300 hover:bg-red-400/10"><LogOut className="size-4" />Sair da partida</button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
