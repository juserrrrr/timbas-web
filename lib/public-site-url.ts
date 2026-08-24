const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://juser.dev").replace(/\/+$/, "")

export function publicTournamentUrl(tournamentId: string) {
  return `${PUBLIC_SITE_URL}/t/${encodeURIComponent(tournamentId)}`
}

