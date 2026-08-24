const PUBLIC_SITE_URL = "https://timbas.juserdev.com"

export function publicTournamentUrl(tournamentId: string) {
  return `${PUBLIC_SITE_URL}/dashboard/tournaments/${encodeURIComponent(tournamentId)}`
}
