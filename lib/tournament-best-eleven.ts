import type { TournamentEaPlayerStats } from "@/lib/services/tournaments.types"

export type FormationLine = "attack" | "midfield" | "defense" | "goalkeeper"

export interface FormationSlot {
  key: string
  position: string
  line: FormationLine
  player: TournamentEaPlayerStats | null
  adapted: boolean
}

const POSITION_ALIASES: Record<string, string> = {
  GK: "GOL",
  G: "GOL",
  GOALKEEPER: "GOL",
  GOL: "GOL",
  LB: "LE",
  LWB: "LE",
  LE: "LE",
  CB: "ZAG",
  LCB: "ZAG",
  RCB: "ZAG",
  ZAG: "ZAG",
  RB: "LD",
  RWB: "LD",
  LD: "LD",
  CDM: "VOL",
  LDM: "VOL",
  RDM: "VOL",
  VOL: "VOL",
  CM: "MC",
  LCM: "MC",
  RCM: "MC",
  MC: "MC",
  CAM: "MEI",
  LAM: "MEI",
  RAM: "MEI",
  MEI: "MEI",
  LM: "PE",
  LW: "PE",
  LF: "PE",
  PE: "PE",
  ST: "ATA",
  CF: "ATA",
  FW: "ATA",
  ATA: "ATA",
  RM: "PD",
  RW: "PD",
  RF: "PD",
  PD: "PD",
}

const SLOT_PLAN: Array<Omit<FormationSlot, "player" | "adapted">> = [
  { key: "pe", position: "PE", line: "attack" },
  { key: "ata", position: "ATA", line: "attack" },
  { key: "pd", position: "PD", line: "attack" },
  { key: "vol", position: "VOL", line: "midfield" },
  { key: "mc", position: "MC", line: "midfield" },
  { key: "mei", position: "MEI", line: "midfield" },
  { key: "le", position: "LE", line: "defense" },
  { key: "zag-1", position: "ZAG", line: "defense" },
  { key: "zag-2", position: "ZAG", line: "defense" },
  { key: "ld", position: "LD", line: "defense" },
  { key: "gol", position: "GOL", line: "goalkeeper" },
]

export function canonicalTournamentPosition(position: string | null): string | null {
  if (!position) return null
  const normalized = position.trim().toUpperCase().replace(/[^A-Z]/g, "")
  return POSITION_ALIASES[normalized] ?? null
}

function lineForPosition(position: string | null): FormationLine | null {
  if (!position) return null
  if (position === "GOL") return "goalkeeper"
  if (["LE", "ZAG", "LD"].includes(position)) return "defense"
  if (["VOL", "MC", "MEI"].includes(position)) return "midfield"
  if (["PE", "ATA", "PD"].includes(position)) return "attack"
  return null
}

function playerScore(player: TournamentEaPlayerStats) {
  return Math.min(10, player.craqueScore ?? player.averageRating ?? 0)
}

export function buildBestEleven(players: TournamentEaPlayerStats[]): FormationSlot[] {
  const ranked = [...players]
    .filter((player) => player.ratedAppearances > 0)
    .sort(
      (a, b) =>
        playerScore(b) - playerScore(a) ||
        b.appearances - a.appearances ||
        a.playerName.localeCompare(b.playerName, "pt-BR"),
    )
  const available = new Set(ranked)
  const slots: FormationSlot[] = SLOT_PLAN.map((slot) => ({ ...slot, player: null, adapted: false }))

  const assign = (slot: FormationSlot, candidates: TournamentEaPlayerStats[]) => {
    const player = candidates.find((candidate) => available.has(candidate))
    if (!player) return
    slot.player = player
    slot.adapted = canonicalTournamentPosition(player.primaryPosition) !== slot.position
    available.delete(player)
  }

  for (const slot of slots) {
    assign(slot, ranked.filter((player) => canonicalTournamentPosition(player.primaryPosition) === slot.position))
  }
  for (const slot of slots.filter((item) => !item.player)) {
    assign(
      slot,
      ranked.filter(
        (player) => lineForPosition(canonicalTournamentPosition(player.primaryPosition)) === slot.line,
      ),
    )
  }
  for (const slot of slots.filter((item) => !item.player)) assign(slot, ranked)

  return slots
}
