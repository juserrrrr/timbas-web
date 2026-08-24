const SHARED_AWARD_SIZE = {
  qrSize: 0.132,
  textWidth: 0.43,
} as const

export const AWARD_CARD_CONFIG = {
  artilheiro: { title: "ARTILHEIRO", value: "12 GOLS", image: "/images/awards/artilheiro-template.png?v=11", color: "#ffbd35", highlight: "#fff0b0", nickX: 0.42, nickY: 0.736, statX: 0.42, statY: 0.81, qrX: 0.664, qrY: 0.72, ...SHARED_AWARD_SIZE },
  garcom: { title: "GARÇOM", value: "9 ASSISTÊNCIAS", image: "/images/awards/garcom-template.png?v=11", color: "#38bdf8", highlight: "#d8f5ff", nickX: 0.409, nickY: 0.746, statX: 0.409, statY: 0.81, qrX: 0.66, qrY: 0.72, ...SHARED_AWARD_SIZE },
  craque: { title: "CRAQUE DO CAMPEONATO", value: "NOTA 9,2", image: "/images/awards/craque-template.png?v=11", color: "#f4c542", highlight: "#fff2a8", nickX: 0.414, nickY: 0.729, statX: 0.414, statY: 0.8, qrX: 0.664, qrY: 0.705, ...SHARED_AWARD_SIZE },
  maestro: { title: "MAESTRO", value: "184 PASSES CERTOS", image: "/images/awards/maestro-template.png?v=11", color: "#2dd4bf", highlight: "#c9fff7", nickX: 0.41, nickY: 0.735, statX: 0.41, statY: 0.802, qrX: 0.663, qrY: 0.72, ...SHARED_AWARD_SIZE },
  xerife: { title: "XERIFE", value: "31 DESARMES", image: "/images/awards/xerife-template.png?v=11", color: "#e2e8f0", highlight: "#ffffff", nickX: 0.406, nickY: 0.716, statX: 0.406, statY: 0.794, qrX: 0.649, qrY: 0.695, ...SHARED_AWARD_SIZE },
  muralha: { title: "MURALHA", value: "27 DEFESAS", image: "/images/awards/muralha-template.png?v=11", color: "#ef4444", highlight: "#ffc2c2", nickX: 0.406, nickY: 0.718, statX: 0.406, statY: 0.794, qrX: 0.663, qrY: 0.697, ...SHARED_AWARD_SIZE },
} as const

export type AwardCardKey = keyof typeof AWARD_CARD_CONFIG
export type AwardCardConfig = (typeof AWARD_CARD_CONFIG)[AwardCardKey]

export function awardCardByTitle(title: string): AwardCardConfig | undefined {
  return Object.values(AWARD_CARD_CONFIG).find((award) => award.title.localeCompare(title, "pt-BR", { sensitivity: "base" }) === 0)
}
