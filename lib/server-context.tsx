"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { getToken } from "@/lib/auth"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getMatchHistory, Match } from "@/lib/services/matches"

export const SERVERS = [
  { id: "779382528821166100", name: "Timbas" },
  { id: "465211051865276426", name: "Entrosa Não" },
  { id: "1187881256508211321", name: "Fusão" },
  { id: "4", name: "TimbasBot Official" },
]

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
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)
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
