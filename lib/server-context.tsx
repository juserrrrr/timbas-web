"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { getToken } from "@/lib/auth"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getMatchHistory, Match } from "@/lib/services/matches"

import { SERVERS, SERVER_COOKIE } from "@/lib/servers"
export { SERVERS, SERVER_COOKIE }

function saveServerCookie(id: string) {
  if (typeof document === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${SERVER_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`
}

const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry {
  ranking: PlayerStats[]
  matches: Match[]
  fetchedAt: number
}

// Módulo-level: sobrevive à navegação entre páginas no SPA
const cache = new Map<string, CacheEntry>()

interface ServerContextType {
  selectedServer: string
  setSelectedServer: (id: string) => void
  serverName: string
  ranking: PlayerStats[]
  matches: Match[]
  dashboardLoading: boolean
}

const ServerContext = createContext<ServerContextType>({
  selectedServer: SERVERS[0].id,
  setSelectedServer: () => {},
  serverName: SERVERS[0].name,
  ranking: [],
  matches: [],
  dashboardLoading: true,
})

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [selectedServer, setSelectedServerState] = useState(SERVERS[0].id)

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SERVER_COOKIE}=([^;]*)`))
    if (match) {
      const saved = decodeURIComponent(match[1])
      if (SERVERS.find((s) => s.id === saved)) setSelectedServerState(saved)
    }
  }, [])

  const setSelectedServer = (id: string) => {
    saveServerCookie(id)
    setSelectedServerState(id)
  }
  const [ranking, setRanking] = useState<PlayerStats[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)

  const serverName = SERVERS.find((s) => s.id === selectedServer)?.name ?? ""

  useEffect(() => {
    const cached = cache.get(selectedServer)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setRanking(cached.ranking)
      setMatches(cached.matches)
      setDashboardLoading(false)
      return
    }

    setDashboardLoading(true)
    const token = getToken()
    if (!token) {
      setDashboardLoading(false)
      return
    }

    Promise.all([
      getRanking(token, selectedServer),
      getMatchHistory(token, selectedServer),
    ])
      .then(([r, m]) => {
        cache.set(selectedServer, { ranking: r, matches: m, fetchedAt: Date.now() })
        setRanking(r)
        setMatches(m)
      })
      .catch(() => {})
      .finally(() => setDashboardLoading(false))
  }, [selectedServer])

  return (
    <ServerContext.Provider value={{ selectedServer, setSelectedServer, serverName, ranking, matches, dashboardLoading }}>
      {children}
    </ServerContext.Provider>
  )
}

export function useServer() {
  return useContext(ServerContext)
}
