import type { TournamentDetail, TournamentMatch } from "./services/tournaments.types"

const OPEN = new Set(["READY", "AWAITING_PROOF", "DISPUTED"])
const MATCH_COMPLETION_REVIEW_MINUTES = 240

function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function matchTiming(match: TournamentMatch, tournament: TournamentDetail, now = Date.now()) {
  if (!OPEN.has(match.status) || !match.readyAt) return null
  if (tournament.matchWindowMinutes > 0 && match.homeReadyAt && match.awayReadyAt) {
    const startedAt = Math.max(new Date(match.homeReadyAt).getTime(), new Date(match.awayReadyAt).getTime())
    const deadlineAt = startedAt + MATCH_COMPLETION_REVIEW_MINUTES * 60_000
    if (now >= deadlineAt) return { label: "Aguardando revisão", deadlineAt, expired: true, waiting: false }
    return { label: `Em andamento, revisão em ${duration(deadlineAt - now)}`, deadlineAt, expired: false, waiting: false }
  }
  const readyAt = new Date(match.readyAt).getTime()
  const startsAt = tournament.startsAt ? new Date(tournament.startsAt).getTime() : 0
  const beginsAt = Math.max(readyAt, startsAt)
  const regularMinutes = tournament.matchWindowMinutes > 0
    ? tournament.matchWindowMinutes
    : tournament.woAfterHours * 60
  if (regularMinutes <= 0) return null
  const graceUses = Number(match.homeGraceUsed) + Number(match.awayGraceUsed)
  const deadlineAt = beginsAt + (regularMinutes + graceUses * tournament.graceMinutes) * 60_000
  if (now < beginsAt) return { label: `Começa em ${duration(beginsAt - now)}`, deadlineAt, expired: false, waiting: true }
  if (now >= deadlineAt) return { label: "Prazo encerrado", deadlineAt, expired: true, waiting: false }
  return { label: `Restam ${duration(deadlineAt - now)}`, deadlineAt, expired: false, waiting: false }
}
