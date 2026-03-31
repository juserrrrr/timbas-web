"use client"

import { createContext, useContext, useState } from "react"

export const SERVERS = [
  { id: "779382528821166100", name: "Timbas" },
  { id: "465211051865276426", name: "Entrosa Não" },
  { id: "1187881256508211321", name: "Fusão" },
  { id: "4", name: "TimbasBot Official" },
]

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
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)
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
