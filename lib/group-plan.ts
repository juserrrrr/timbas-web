// Mesma regra que a API aplica em groupPlanIssue: grupos do mesmo tamanho, com
// pelo menos 2 times, e nunca classificando o grupo inteiro.
const GROUP_COUNTS = [2, 3, 4, 5, 6, 7, 8]
const ADVANCE_COUNTS = [1, 2, 3, 4]

export function groupCountOptions(teamCount: number): number[] {
  return GROUP_COUNTS.filter((count) => teamCount % count === 0 && teamCount / count >= 2)
}

export function advancePerGroupOptions(teamCount: number, groupCount: number): number[] {
  return ADVANCE_COUNTS.filter((count) => count < teamCount / groupCount)
}

export function pickOption(options: number[], preferred: number, fallback: number): number {
  if (options.includes(preferred)) return preferred
  return options[0] ?? fallback
}
