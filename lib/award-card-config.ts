export const AWARD_CARD_CONFIG = {
  artilheiro: { title: "ARTILHEIRO", value: "12 GOLS", image: "/images/awards/artilheiro-template.png?v=6", color: "#ffbd35", highlight: "#fff0b0", nickX: 0.41, nickY: 0.73, statX: 0.41, statY: 0.80, qrX: 0.655, qrY: 0.714, qrSize: 0.132, textWidth: 0.43, statScale: 1 },
  garcom: { title: "GARÇOM", value: "9 ASSISTÊNCIAS", image: "/images/awards/garcom-template.png?v=6", color: "#38bdf8", highlight: "#d8f5ff", nickX: 0.41, nickY: 0.742, statX: 0.41, statY: 0.803, qrX: 0.655, qrY: 0.708, qrSize: 0.132, textWidth: 0.41, statScale: 0.9 },
  craque: { title: "CRAQUE DO CAMPEONATO", value: "NOTA 9,2", image: "/images/awards/craque-template.png?v=6", color: "#f4c542", highlight: "#fff2a8", nickX: 0.40, nickY: 0.715, statX: 0.40, statY: 0.804, qrX: 0.655, qrY: 0.684, qrSize: 0.132, textWidth: 0.42, statScale: 1 },
  maestro: { title: "MAESTRO", value: "184 PASSES CERTOS", image: "/images/awards/maestro-template.png?v=6", color: "#2dd4bf", highlight: "#c9fff7", nickX: 0.415, nickY: 0.72, statX: 0.415, statY: 0.805, qrX: 0.655, qrY: 0.687, qrSize: 0.132, textWidth: 0.42, statScale: 0.78 },
  xerife: { title: "XERIFE", value: "31 DESARMES", image: "/images/awards/xerife-template.png?v=6", color: "#e2e8f0", highlight: "#ffffff", nickX: 0.41, nickY: 0.71, statX: 0.41, statY: 0.79, qrX: 0.652, qrY: 0.686, qrSize: 0.132, textWidth: 0.48, statScale: 0.92 },
  muralha: { title: "MURALHA", value: "27 DEFESAS", image: "/images/awards/muralha-template.png?v=6", color: "#ef4444", highlight: "#ffc2c2", nickX: 0.41, nickY: 0.715, statX: 0.41, statY: 0.79, qrX: 0.652, qrY: 0.686, qrSize: 0.132, textWidth: 0.43, statScale: 0.94 },
} as const

export type AwardCardKey = keyof typeof AWARD_CARD_CONFIG
export type AwardCardConfig = (typeof AWARD_CARD_CONFIG)[AwardCardKey]

export function awardCardByTitle(title: string): AwardCardConfig | undefined {
  return Object.values(AWARD_CARD_CONFIG).find((award) => award.title.localeCompare(title, "pt-BR", { sensitivity: "base" }) === 0)
}
