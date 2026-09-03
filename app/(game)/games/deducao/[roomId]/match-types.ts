import type { MapTaskSpot, MapVent } from "@/lib/services/games"

export type Quality = "alto" | "medio" | "baixo"

/// Para onde a cabeça está virada. Vive num ref porque muda
/// em todo movimento do mouse e não pode passar pelo React.
export interface LookState {
  yaw: number
  pitch: number
}

/// A cena atualiza a interface somente quando o alvo ao alcance muda.
export interface Targets {
  task: MapTaskSpot | null
  corpse: { id: string; name: string } | null
  emergency: boolean
  vent: MapVent | null
  kill: { id: string; name: string } | null
}

export const NO_TARGETS: Targets = {
  task: null,
  corpse: null,
  emergency: false,
  vent: null,
  kill: null,
}
