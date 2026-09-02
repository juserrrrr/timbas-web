"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { PlayerRow } from "./use-deducao-room"

interface Props {
  player: PlayerRow
  /// Papel revelado. Só aparece no fim da partida.
  role?: string
  host?: boolean
  you?: boolean
  hint?: string
  stamp?: "morto" | "demitido" | null
  selected?: boolean
  onClick?: () => void
  footer?: ReactNode
}

const ROLE_LABEL: Record<string, string> = {
  assassino: "Assassino",
  detetive: "Detetive",
  funcionario: "Funcionário",
}

export function PlayerBadge({ player, role, host, you, hint, stamp, selected, onClick, footer }: Props) {
  const Tag = onClick ? "button" : "div"

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border bg-zinc-900/70 pb-3 pl-4 pr-3 pt-6 text-left transition",
        selected ? "border-amber-400/60 bg-amber-400/[0.07]" : "border-white/[0.08] hover:border-white/[0.16]",
        onClick && "cursor-pointer",
        !player.alive && !role && "opacity-45",
      )}
    >
      {/* O furo do cordão. É o que faz a ficha parecer um crachá e não um card. */}
      <span className="absolute left-1/2 top-2 h-1.5 w-9 -translate-x-1/2 rounded-full bg-black/70 ring-1 ring-white/[0.06]" />
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: player.color }} />

      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-zinc-950"
          style={{ backgroundColor: player.color }}
        >
          {player.name.slice(0, 2).toUpperCase()}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-black leading-tight text-white">{player.name}</span>
            {you && <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-amber-300">você</span>}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {role ? (ROLE_LABEL[role] ?? role) : host ? "Anfitrião" : (hint ?? "Funcionário")}
          </span>
        </span>

        {!player.connected && (
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">caiu</span>
        )}
      </div>

      {footer}

      {stamp && (
        <span
          className={cn(
            "pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 rotate-[-14deg] rounded border-2 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-[0.18em]",
            stamp === "morto" ? "border-red-500/60 text-red-400/80" : "border-amber-400/60 text-amber-300/80",
          )}
        >
          {stamp === "morto" ? "Morto" : "Expulso"}
        </span>
      )}

      {role === "assassino" && (
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-red-500/40" />
      )}
    </Tag>
  )
}
