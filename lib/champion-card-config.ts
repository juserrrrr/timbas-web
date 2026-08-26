import type { AwardFontKey } from "@/lib/award-card-config"

export interface ChampionCardLayout {
  font: AwardFontKey
  championTitleX: number
  championTitleY: number
  championTitleSize: number
  championTitleWidth: number
  teamX: number
  teamY: number
  teamSize: number
  teamWidth: number
  tournamentX: number
  tournamentY: number
  tournamentSize: number
  tournamentWidth: number
  rosterX: number
  rosterY: number
  rosterWidth: number
  rosterHeight: number
  rosterSize: number
  rosterColumns: number
  rosterTitleX: number
  rosterTitleY: number
  rosterTitleSize: number
  rosterTitleWidth: number
  qrX: number
  qrY: number
  qrSize: number
}

export const DEFAULT_CHAMPION_CARD_LAYOUT: ChampionCardLayout = {
  font: "teko",
  championTitleX: 0.5,
  championTitleY: 0.612,
  championTitleSize: 0.026,
  championTitleWidth: 0.18,
  teamX: 0.5,
  teamY: 0.65,
  teamSize: 0.058,
  teamWidth: 0.78,
  tournamentX: 0.5,
  tournamentY: 0.684,
  tournamentSize: 0.024,
  tournamentWidth: 0.72,
  rosterX: 0.205,
  rosterY: 0.752,
  rosterWidth: 0.42,
  rosterHeight: 0.078,
  rosterSize: 0.018,
  rosterColumns: 2,
  rosterTitleX: 0.415,
  rosterTitleY: 0.73,
  rosterTitleSize: 0.017,
  rosterTitleWidth: 0.18,
  qrX: 0.68,
  qrY: 0.731,
  qrSize: 0.112,
}

export type AwardCardSettings = {
  campeao?: ChampionCardLayout
}
