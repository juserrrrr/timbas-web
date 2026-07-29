export type GameModeEnum = 'SUMMONERS_RIFT' | 'LOL_CLASSIC' | 'ARAM'

/**
 * Espelha apiTimbas/src/customLeagueMath/game-mode.constants.ts.
 * O mapa é derivado do modo, nunca guardado separado.
 */
export const GAME_MODE_LABELS: Record<GameModeEnum, string> = {
  SUMMONERS_RIFT: 'Normal',
  LOL_CLASSIC: 'League Classic',
  ARAM: 'ARAM',
}

export const GAME_MODE_MAP_NAMES: Record<GameModeEnum, string> = {
  SUMMONERS_RIFT: "Summoner's Rift",
  LOL_CLASSIC: "Summoner's Rift (2013)",
  ARAM: 'Howling Abyss',
}

export const GAME_MODE_OPTIONS: { value: GameModeEnum; label: string; desc: string }[] = [
  { value: 'SUMMONERS_RIFT', label: 'Normal', desc: "Summoner's Rift atual, o mapa padrão de 3 rotas" },
  { value: 'LOL_CLASSIC', label: 'League Classic', desc: "Summoner's Rift de 2013, com campeões, itens e runas antigos" },
  { value: 'ARAM', label: 'ARAM', desc: 'Howling Abyss, ponte única com campeões aleatórios' },
]

/** ARAM tem uma rota só, então não dá para sortear lanes. */
export function supportsLanes(gameMode: GameModeEnum): boolean {
  return gameMode !== 'ARAM'
}

export function gameModeLabel(gameMode?: GameModeEnum | null): string {
  return GAME_MODE_LABELS[gameMode ?? 'SUMMONERS_RIFT'] ?? GAME_MODE_LABELS.SUMMONERS_RIFT
}

export function gameModeMapName(gameMode?: GameModeEnum | null): string {
  return GAME_MODE_MAP_NAMES[gameMode ?? 'SUMMONERS_RIFT'] ?? GAME_MODE_MAP_NAMES.SUMMONERS_RIFT
}
