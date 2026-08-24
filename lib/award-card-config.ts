export const AWARD_CARD_CONFIG = {
  artilheiro: { title: "ARTILHEIRO", value: "12 GOLS", image: "/images/awards/artilheiro-template.png", color: "#ffbd35", qrLight: "#ffe09a", nickX: 0.42, nickY: 0.73, statX: 0.42, statY: 0.80, qrX: 0.66, qrY: 0.71, qrSize: 0.13, textWidth: 0.43 },
  garcom: { title: "GARÇOM", value: "9 ASSISTÊNCIAS", image: "/images/awards/garcom-template.png", color: "#38bdf8", qrLight: "#a9e4ff", nickX: 0.42, nickY: 0.735, statX: 0.42, statY: 0.795, qrX: 0.66, qrY: 0.71, qrSize: 0.13, textWidth: 0.41 },
  craque: { title: "CRAQUE DO CAMPEONATO", value: "NOTA 9,2", image: "/images/awards/craque-template.png", color: "#f4c542", qrLight: "#f3dd91", nickX: 0.42, nickY: 0.715, statX: 0.42, statY: 0.795, qrX: 0.66, qrY: 0.71, qrSize: 0.13, textWidth: 0.42 },
  maestro: { title: "MAESTRO", value: "184 PASSES CERTOS", image: "/images/awards/maestro-template.png", color: "#2dd4bf", qrLight: "#a2f3e8", nickX: 0.42, nickY: 0.755, statX: 0.42, statY: 0.84, qrX: 0.66, qrY: 0.71, qrSize: 0.13, textWidth: 0.42 },
  xerife: { title: "XERIFE", value: "31 DESARMES", image: "/images/awards/xerife-template.png", color: "#e2e8f0", qrLight: "#dce3ea", nickX: 0.42, nickY: 0.705, statX: 0.42, statY: 0.80, qrX: 0.66, qrY: 0.71, qrSize: 0.13, textWidth: 0.48 },
  muralha: { title: "MURALHA", value: "27 DEFESAS", image: "/images/awards/muralha-template.png", color: "#ef4444", qrLight: "#ffaaaa", nickX: 0.42, nickY: 0.715, statX: 0.42, statY: 0.79, qrX: 0.66, qrY: 0.71, qrSize: 0.13, textWidth: 0.43 },
} as const

export type AwardCardKey = keyof typeof AWARD_CARD_CONFIG
export type AwardCardConfig = (typeof AWARD_CARD_CONFIG)[AwardCardKey]

export function awardCardByTitle(title: string): AwardCardConfig | undefined {
  return Object.values(AWARD_CARD_CONFIG).find((award) => award.title.localeCompare(title, "pt-BR", { sensitivity: "base" }) === 0)
}
