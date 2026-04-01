"use client"

import { Server } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useServer, SERVERS } from "@/lib/server-context"

export function ServerSelector() {
  const { selectedServer, setSelectedServer } = useServer()
  return (
    <Select value={selectedServer} onValueChange={setSelectedServer}>
      <SelectTrigger className="h-8 w-[160px] cursor-pointer gap-1.5 rounded-lg border-white/[0.08] bg-white/[0.04] text-sm text-gray-300 hover:bg-white/[0.07] focus:ring-0">
        <Server className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-white/[0.08] bg-[#0d0d12] text-white shadow-xl shadow-black/50 backdrop-blur-xl">
        {SERVERS.map((s) => (
          <SelectItem key={s.id} value={s.id} className="text-sm focus:bg-white/[0.06] focus:text-white">
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
