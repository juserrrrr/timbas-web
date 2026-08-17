// Espelha src/player-catalog/attributes.ts da API: as mesmas seis colunas
// mudam de significado para goleiro, como no card do EA FC.
export const ATTRIBUTE_KEYS = ["pace", "shooting", "passing", "dribbling", "defending", "physical"] as const

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number]

export interface WithAttributes {
  position: string
  pace: number | null
  shooting: number | null
  passing: number | null
  dribbling: number | null
  defending: number | null
  physical: number | null
}

const OUTFIELD = ["RIT", "FIN", "PAS", "DRI", "DEF", "FIS"]
const GOALKEEPER = ["ELA", "MAN", "CHU", "REF", "VEL", "POS"]

const OUTFIELD_LONG = ["Ritmo", "Finalização", "Passe", "Drible", "Defesa", "Físico"]
const GOALKEEPER_LONG = ["Elasticidade", "Manejo", "Chute", "Reflexos", "Velocidade", "Posicionamento"]

export function isGoalkeeper(position: string): boolean {
  return position.toUpperCase() === "GOL"
}

export function attributeShortLabels(position: string): string[] {
  return isGoalkeeper(position) ? GOALKEEPER : OUTFIELD
}

export function attributeLongLabels(position: string): string[] {
  return isGoalkeeper(position) ? GOALKEEPER_LONG : OUTFIELD_LONG
}

export function hasAttributes(player: WithAttributes): boolean {
  return ATTRIBUTE_KEYS.some((key) => player[key] !== null)
}

/// Pares rótulo e valor na ordem do card, prontos para exibir.
export function attributeRow(player: WithAttributes): Array<{ label: string; value: number | null }> {
  const labels = attributeShortLabels(player.position)
  return ATTRIBUTE_KEYS.map((key, index) => ({ label: labels[index], value: player[key] }))
}

export function attributeTone(value: number | null): string {
  if (value === null) return "text-gray-700"
  if (value >= 85) return "text-emerald-300"
  if (value >= 75) return "text-emerald-400/80"
  if (value >= 65) return "text-amber-400/80"
  return "text-gray-500"
}
