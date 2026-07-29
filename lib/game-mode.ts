export type GameModeEnum = 'CLASSIC' | 'ARAM'

/**
 * Espelha apiTimbas/src/customLeagueMath/game-mode.constants.ts.
 * O mapa é derivado do modo, nunca guardado separado.
 */
export const GAME_MODE_LABELS: Record<GameModeEnum, string> = {
  CLASSIC: 'Clássico',
  ARAM: 'ARAM',
}

export const GAME_MODE_MAP_NAMES: Record<GameModeEnum, string> = {
  CLASSIC: "Summoner's Rift",
  ARAM: 'Howling Abyss',
}

export const GAME_MODE_OPTIONS: { value: GameModeEnum; label: string; desc: string }[] = [
  { value: 'CLASSIC', label: 'Clássico', desc: "Summoner's Rift, o mapa padrão de 3 rotas" },
  { value: 'ARAM', label: 'ARAM', desc: 'Howling Abyss, ponte única com campeões aleatórios' },
]

/** ARAM tem uma rota só, então não dá para sortear lanes. */
export function supportsLanes(gameMode: GameModeEnum): boolean {
  return gameMode === 'CLASSIC'
}

export function gameModeLabel(gameMode?: GameModeEnum | null): string {
  return GAME_MODE_LABELS[gameMode ?? 'CLASSIC'] ?? 'Clássico'
}

export function gameModeMapName(gameMode?: GameModeEnum | null): string {
  return GAME_MODE_MAP_NAMES[gameMode ?? 'CLASSIC'] ?? GAME_MODE_MAP_NAMES.CLASSIC
}
