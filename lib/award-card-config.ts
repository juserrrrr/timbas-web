const SHARED_AWARD_LAYOUT = {
  nickX: 0.405,
  nickY: 0.715,
  statX: 0.405,
  statY: 0.79,
  qrX: 0.652,
  qrY: 0.686,
  qrSize: 0.132,
  textWidth: 0.43,
} as const

export const AWARD_CARD_CONFIG = {
  artilheiro: { title: "ARTILHEIRO", value: "12 GOLS", image: "/images/awards/artilheiro-template.png?v=10", color: "#ffbd35", highlight: "#fff0b0", ...SHARED_AWARD_LAYOUT },
  garcom: { title: "GARÇOM", value: "9 ASSISTÊNCIAS", image: "/images/awards/garcom-template.png?v=10", color: "#38bdf8", highlight: "#d8f5ff", ...SHARED_AWARD_LAYOUT },
  craque: { title: "CRAQUE DO CAMPEONATO", value: "NOTA 9,2", image: "/images/awards/craque-template.png?v=10", color: "#f4c542", highlight: "#fff2a8", ...SHARED_AWARD_LAYOUT },
  maestro: { title: "MAESTRO", value: "184 PASSES CERTOS", image: "/images/awards/maestro-template.png?v=10", color: "#2dd4bf", highlight: "#c9fff7", ...SHARED_AWARD_LAYOUT },
  xerife: { title: "XERIFE", value: "31 DESARMES", image: "/images/awards/xerife-template.png?v=10", color: "#e2e8f0", highlight: "#ffffff", ...SHARED_AWARD_LAYOUT },
  muralha: { title: "MURALHA", value: "27 DEFESAS", image: "/images/awards/muralha-template.png?v=10", color: "#ef4444", highlight: "#ffc2c2", ...SHARED_AWARD_LAYOUT },
} as const

export type AwardCardKey = keyof typeof AWARD_CARD_CONFIG
export type AwardCardConfig = (typeof AWARD_CARD_CONFIG)[AwardCardKey]

export function awardCardByTitle(title: string): AwardCardConfig | undefined {
  return Object.values(AWARD_CARD_CONFIG).find((award) => award.title.localeCompare(title, "pt-BR", { sensitivity: "base" }) === 0)
}
