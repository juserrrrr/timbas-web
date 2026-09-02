import type { MapTaskSpot, MapVent } from "@/lib/services/games"

export type Quality = "alto" | "medio" | "baixo"

/// O que está ao alcance da mão agora. A cena calcula a cada quadro e só avisa
/// a interface quando o alvo troca, senão o HUD redesenharia sessenta vezes por
/// segundo para não mudar nada.
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
