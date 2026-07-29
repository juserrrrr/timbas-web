import { GAME_MODE_LABELS, type GameModeEnum } from './game-mode'

/**
 * Filtros do ranking. `undefined` significa geral: sem restrição de mapa ou
 * de tamanho de time. Compartilhado entre a página (render no servidor) e o
 * componente (cliente) para os dois começarem com o mesmo recorte.
 */
export const DEFAULT_RANKING_GAME_MODE: GameModeEnum = 'SUMMONERS_RIFT'
export const DEFAULT_RANKING_PLAYERS_PER_TEAM = 5

export const RANKING_GAME_MODE_TABS: { label: string; value: GameModeEnum | undefined }[] = [
  { label: GAME_MODE_LABELS.SUMMONERS_RIFT, value: 'SUMMONERS_RIFT' },
  { label: GAME_MODE_LABELS.LOL_CLASSIC, value: 'LOL_CLASSIC' },
  { label: GAME_MODE_LABELS.ARAM, value: 'ARAM' },
  { label: 'Geral', value: undefined },
]

export const RANKING_SIZE_TABS: { label: string; value: number | undefined }[] = [
  { label: '1v1', value: 1 },
  { label: '3v3', value: 3 },
  { label: '5v5', value: 5 },
  { label: 'Geral', value: undefined },
]
