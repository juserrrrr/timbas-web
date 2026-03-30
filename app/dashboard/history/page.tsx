"use client"

import { useState, useEffect } from "react"
import { Calendar, Server, Trophy, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getMatchHistory, Match } from "@/lib/services/matches"

const SERVERS = [
  { id: "779382528821166100", name: "Timbas" },
  { id: "465211051865276426", name: "Entrosa Não" },
  { id: "1187881256508211321", name: "Fusão" },
  { id: "4", name: "TimbasBot Official" },
]

const MATCH_TYPE_LABELS: Record<string, string> = {
  ALEATORIO: "Aleatório",
  LIVRE: "Livre",
  BALANCEADO: "Balanceado",
  ALEATORIO_COMPLETO: "Aleatório Completo",
}

export default function HistoryPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = process.env.NEXT_PUBLIC_API_TOKEN
        if (!token) throw new Error("NEXT_PUBLIC_API_TOKEN não definido")
        const data = await getMatchHistory(token, selectedServer)
        setMatches(data)
      } catch (err) {
        setError("Falha ao carregar histórico. Tente novamente mais tarde.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMatches()
  }, [selectedServer])

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Histórico de Partidas</h1>
          <p className="text-gray-400">Veja todas as partidas jogadas e seus resultados</p>
        </div>
        <Select value={selectedServer} onValueChange={(v) => { setSelectedServer(v); setMatches([]) }}>
          <SelectTrigger className="w-full border-gray-700 bg-gray-800/50 text-white sm:w-[240px]">
            <Server className="mr-2 h-4 w-4 text-blue-400" />
            <SelectValue placeholder="Selecione um servidor" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900 text-white">
            {SERVERS.map((s) => (
              <SelectItem key={s.id} value={s.id} className="focus:bg-gray-800 focus:text-white">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed border-red-500/50 bg-red-500/10 p-12 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">Nenhuma partida encontrada para este servidor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, index) => {
            const blueWon = match.winnerId === match.blueTeam.id
            const redWon = match.winnerId === match.redTeam.id
            const pending = match.winnerId === null
            const date = new Date(match.dateCreated)

            return (
              <Card key={match.id} className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/50 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-700 bg-gradient-to-br from-blue-600/20 to-red-600/20">
                      <span className="text-xl font-bold text-white">#{matches.length - index}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Partida {matches.length - index}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-gray-700 text-gray-300">
                      {MATCH_TYPE_LABELS[match.matchType] ?? match.matchType}
                    </Badge>
                    {pending && (
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                        Em andamento
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className={`rounded-lg border p-4 ${blueWon ? "border-blue-500/50 bg-blue-500/5" : "border-gray-800/50 bg-gray-900/30"}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <h4 className="font-bold text-blue-400">Time Azul</h4>
                      </div>
                      {blueWon && (
                        <Badge className="border-blue-500/50 bg-blue-500/20 text-blue-400">
                          <Trophy className="mr-1 h-3 w-3" />Vitória
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {match.blueTeam.players.map((player) => (
                        <div key={player.userId} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm">
                          <span className="font-medium text-white">{player.name}</span>
                          {player.position && <span className="text-xs text-gray-500">{player.position}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-lg border p-4 ${redWon ? "border-red-500/50 bg-red-500/5" : "border-gray-800/50 bg-gray-900/30"}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <h4 className="font-bold text-red-400">Time Vermelho</h4>
                      </div>
                      {redWon && (
                        <Badge className="border-red-500/50 bg-red-500/20 text-red-400">
                          <Trophy className="mr-1 h-3 w-3" />Vitória
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {match.redTeam.players.map((player) => (
                        <div key={player.userId} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm">
                          <span className="font-medium text-white">{player.name}</span>
                          {player.position && <span className="text-xs text-gray-500">{player.position}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
