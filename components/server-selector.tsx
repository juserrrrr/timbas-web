"use client"

import { Server } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useServer, SERVERS } from "@/lib/server-context"

export function ServerSelector() {
  const { selectedServer, setSelectedServer } = useServer()
  return (
    <Select value={selectedServer} onValueChange={setSelectedServer}>
      <SelectTrigger className="w-[180px] border-gray-700/50 bg-gray-800/40 text-white backdrop-blur-sm">
        <Server className="mr-2 h-4 w-4 text-blue-400 flex-shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-gray-700 bg-gray-900 text-white">
        {SERVERS.map((s) => (
          <SelectItem key={s.id} value={s.id} className="focus:bg-gray-800 focus:text-white">
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
