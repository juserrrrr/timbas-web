/// Faixas de overall, iguais às de src/football/overall-tier.ts na API. Servem
/// para a lista do draft e da base virem em blocos de dez, que é como a pessoa
/// pensa o jogador: noventa é craque, oitenta é estrela, setenta é titular.

export type OverallTierId = "ELITE" | "STAR" | "STARTER" | "SQUAD"

export interface OverallTier {
  id: OverallTierId
  label: string
  short: string
  min: number
  max: number
  /// Cor do bloco na tela, do craque para o rodapé do elenco.
  tone: string
  chip: string
}

export const OVERALL_TIERS: OverallTier[] = [
  {
    id: "ELITE",
    label: "Craques",
    short: "90+",
    min: 90,
    max: 99,
    tone: "text-amber-400",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  {
    id: "STAR",
    label: "Estrelas",
    short: "80-89",
    min: 80,
    max: 89,
    tone: "text-violet-400",
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  },
  {
    id: "STARTER",
    label: "Titulares",
    short: "70-79",
    min: 70,
    max: 79,
    tone: "text-emerald-400",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "SQUAD",
    label: "Elenco",
    short: "< 70",
    min: 0,
    max: 69,
    tone: "text-gray-400",
    chip: "border-white/15 bg-white/[0.06] text-gray-300",
  },
]

export function tierOf(overall: number): OverallTier {
  const level = Math.round(overall)
  return OVERALL_TIERS.find((tier) => level >= tier.min) ?? OVERALL_TIERS[OVERALL_TIERS.length - 1]
}

/// Agrupa na ordem do craque para o elenco, dentro de cada faixa do maior
/// overall para o menor, e deixa de fora a faixa que ficou vazia.
export function groupByTier<T extends { overall: number }>(players: T[]): Array<{ tier: OverallTier; players: T[] }> {
  return OVERALL_TIERS.map((tier) => ({
    tier,
    players: players
      .filter((player) => tierOf(player.overall).id === tier.id)
      .sort((a, b) => b.overall - a.overall),
  })).filter((group) => group.players.length > 0)
}
