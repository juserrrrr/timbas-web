export const AWARD_FONT_OPTIONS = [
  { key: "anton", label: "Anton · clássico", family: "Anton" },
  { key: "tourney", label: "Tourney · esportiva", family: "Tourney" },
  { key: "cinzel", label: "Cinzel Decorative · ornamental", family: "Cinzel Decorative" },
  { key: "black-ops", label: "Black Ops One · tecnológica", family: "Black Ops One" },
  { key: "graduate", label: "Graduate · universitária", family: "Graduate" },
  { key: "teko", label: "Teko · condensada", family: "Teko" },
] as const

export type AwardFontKey = (typeof AWARD_FONT_OPTIONS)[number]["key"]
export type AwardCardKey = "artilheiro" | "garcom" | "craque" | "maestro" | "xerife" | "muralha"

export interface AwardCardLayout {
  font: AwardFontKey
  nickX: number
  nickY: number
  nickSize: number
  statX: number
  statY: number
  statSize: number
  qrX: number
  qrY: number
  qrSize: number
  textWidth: number
  nickAutoFit: boolean
  statAutoFit: boolean
}

export type AwardCardLayoutSettings = Partial<Record<AwardCardKey, AwardCardLayout>>

export interface AwardCardConfig extends AwardCardLayout {
  title: string
  value: string
  image: string
  color: string
  highlight: string
}

const shared = { qrSize: 0.132, textWidth: 0.43, nickSize: 0.068, statSize: 0.046, nickAutoFit: true, statAutoFit: true }

export const AWARD_CARD_CONFIG: Record<AwardCardKey, AwardCardConfig> = {
  artilheiro: { title: "ARTILHEIRO", value: "12 GOLS", image: "/images/awards/artilheiro-template.png?v=11", color: "#ffbd35", highlight: "#fff0b0", font: "teko", nickX: 0.42, nickY: 0.736, statX: 0.42, statY: 0.81, qrX: 0.667, qrY: 0.72, ...shared },
  garcom: { title: "GARÇOM", value: "9 ASSISTÊNCIAS", image: "/images/awards/garcom-template.png?v=11", color: "#38bdf8", highlight: "#d8f5ff", font: "tourney", nickX: 0.409, nickY: 0.746, statX: 0.409, statY: 0.81, qrX: 0.663, qrY: 0.72, ...shared },
  craque: { title: "CRAQUE DO CAMPEONATO", value: "NOTA 9,2", image: "/images/awards/craque-template.png?v=11", color: "#f4c542", highlight: "#fff2a8", font: "cinzel", nickX: 0.414, nickY: 0.729, statX: 0.414, statY: 0.8, qrX: 0.669, qrY: 0.71, ...shared },
  maestro: { title: "MAESTRO", value: "184 PASSES CERTOS", image: "/images/awards/maestro-template.png?v=11", color: "#2dd4bf", highlight: "#c9fff7", font: "black-ops", nickX: 0.41, nickY: 0.735, statX: 0.41, statY: 0.802, qrX: 0.666, qrY: 0.722, ...shared },
  xerife: { title: "XERIFE", value: "31 DESARMES", image: "/images/awards/xerife-template.png?v=11", color: "#e2e8f0", highlight: "#ffffff", font: "graduate", nickX: 0.406, nickY: 0.716, statX: 0.406, statY: 0.794, qrX: 0.654, qrY: 0.7, ...shared },
  muralha: { title: "MURALHA", value: "27 DEFESAS", image: "/images/awards/muralha-template.png?v=11", color: "#ef4444", highlight: "#ffc2c2", font: "cinzel", nickX: 0.406, nickY: 0.718, statX: 0.406, statY: 0.794, qrX: 0.664, qrY: 0.707, ...shared },
}

export const AWARD_FONT_FAMILY: Record<AwardFontKey, string> = Object.fromEntries(
  AWARD_FONT_OPTIONS.map((font) => [font.key, font.family]),
) as Record<AwardFontKey, string>

export function layoutOf(card: AwardCardConfig): AwardCardLayout {
  const { font, nickX, nickY, nickSize, statX, statY, statSize, qrX, qrY, qrSize, textWidth, nickAutoFit, statAutoFit } = card
  return { font, nickX, nickY, nickSize, statX, statY, statSize, qrX, qrY, qrSize, textWidth, nickAutoFit, statAutoFit }
}

export function awardLayoutsFromDefaults(): Record<AwardCardKey, AwardCardLayout> {
  return Object.fromEntries(Object.entries(AWARD_CARD_CONFIG).map(([key, card]) => [key, layoutOf(card)])) as Record<AwardCardKey, AwardCardLayout>
}

export function resolveAwardCard(key: AwardCardKey, settings?: AwardCardLayoutSettings): AwardCardConfig {
  return { ...AWARD_CARD_CONFIG[key], ...(settings?.[key] ?? {}) }
}

export function awardCardByTitle(title: string, settings?: AwardCardLayoutSettings): AwardCardConfig | undefined {
  const entry = (Object.entries(AWARD_CARD_CONFIG) as [AwardCardKey, AwardCardConfig][]).find(([, award]) =>
    award.title.localeCompare(title, "pt-BR", { sensitivity: "base" }) === 0,
  )
  return entry ? resolveAwardCard(entry[0], settings) : undefined
}
