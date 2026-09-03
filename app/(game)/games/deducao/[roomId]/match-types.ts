import type { MapTaskSpot, MapVent } from "@/lib/services/games"

export type Quality = "alto" | "medio" | "baixo"

/// De onde se joga. Primeira pessoa é o padrão: é dela que vem o aperto de não
/// saber quem está atrás de você. A câmera de cima fica como alternativa para
/// quem passa mal com primeira pessoa e para achar o caminho.
export type View = "primeira" | "isometrica"

/// Para onde a cabeça está virada em primeira pessoa. Vive num ref porque muda
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
