"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SERVERS, SERVER_COOKIE } from "@/lib/servers"
export { SERVERS, SERVER_COOKIE }

export interface PlayerStats {
  rank: number
  userId: number
  name: string
  discordId: string
  avatar: string | null
  score: number
  wins: number
  losses: number
  totalGames: number
  winRate: number
}

function saveServerCookie(id: string) {
  if (typeof document === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${SERVER_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`
}

interface ServerContextType {
  selectedServer: string
  setSelectedServer: (id: string) => void
  serverName: string
}

const ServerContext = createContext<ServerContextType>({
  selectedServer: SERVERS[0].id,
  setSelectedServer: () => {},
  serverName: SERVERS[0].name,
})

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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
    router.refresh()
  }

  const serverName = SERVERS.find((s) => s.id === selectedServer)?.name ?? ""

  return (
    <ServerContext.Provider value={{ selectedServer, setSelectedServer, serverName }}>
      {children}
    </ServerContext.Provider>
  )
}

export function useServer() {
  return useContext(ServerContext)
}
