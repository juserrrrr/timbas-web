"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar, Server, Trophy, Users, ShieldHalf } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { getMatchHistory, Match } from "@/lib/services/matches"
import { getToken, decodeToken } from "@/lib/auth"

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

interface PartnerStat {
  userId: number
  name: string
  games: number
  wins: number
  winRate: number
}

export default function HistoryPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const payload = decodeToken(token)
    if (payload) setUserId(Number(payload.sub))
  }, [])

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getToken()
        if (!token) throw new Error("Usuário não autenticado.")
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

  const { partnerStats, blueWins, blueGames, redWins, redGames, myMatches } = useMemo(() => {
    if (userId === null || matches.length === 0) {
      return { partnerStats: [], blueWins: 0, blueGames: 0, redWins: 0, redGames: 0, myMatches: [] }
    }

    const partnerMap: Record<number, { name: string; games: number; wins: number }> = {}
    let bWins = 0, bGames = 0, rWins = 0, rGames = 0
    const myMatchList: Match[] = []

    for (const match of matches) {
      const inBlue = match.blueTeam.players.some((p) => p.userId === userId)
      const inRed = match.redTeam.players.some((p) => p.userId === userId)
      if (!inBlue && !inRed) continue

      myMatchList.push(match)
      const myTeam = inBlue ? match.blueTeam : match.redTeam
      const won = match.winnerId !== null && match.winnerId === myTeam.id

      if (inBlue) {
        bGames++
        if (won) bWins++
      } else {
        rGames++
        if (won) rWins++
      }

      for (const player of myTeam.players) {
        if (player.userId === userId) continue
        if (!partnerMap[player.userId]) {
          partnerMap[player.userId] = { name: player.name, games: 0, wins: 0 }
        }
        partnerMap[player.userId].games++
        if (won) partnerMap[player.userId].wins++
      }
    }

    const partners: PartnerStat[] = Object.entries(partnerMap)
      .map(([id, data]) => ({
        userId: Number(id),
        name: data.name,
        games: data.games,
        wins: data.wins,
        winRate: data.games > 0 ? data.wins / data.games : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)

    return { partnerStats: partners, blueWins: bWins, blueGames: bGames, redWins: rWins, redGames: rGames, myMatches: myMatchList }
  }, [matches, userId])

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
        <div className="flex items-center justify-center h-48">
          <Spinner className="size-8 text-blue-500" />
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
        <>
          {/* Side stats */}
          {myMatches.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-blue-500/20 bg-blue-500/5 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <h3 className="font-bold text-blue-400">Time Azul</h3>
                </div>
                <p className="text-2xl font-bold text-white">
                  {blueGames > 0 ? `${Math.round((blueWins / blueGames) * 100)}%` : "—"}
                </p>
                <p className="text-sm text-gray-400">{blueWins}V / {blueGames - blueWins}D em {blueGames} partidas</p>
              </Card>
              <Card className="border-red-500/20 bg-red-500/5 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <h3 className="font-bold text-red-400">Time Vermelho</h3>
                </div>
                <p className="text-2xl font-bold text-white">
                  {redGames > 0 ? `${Math.round((redWins / redGames) * 100)}%` : "—"}
                </p>
                <p className="text-sm text-gray-400">{redWins}V / {redGames - redWins}D em {redGames} partidas</p>
              </Card>
            </div>
          )}

          {/* Partner stats */}
          {partnerStats.length > 0 && (
            <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldHalf className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Parceiros</h2>
                <span className="text-sm text-gray-400 ml-1">— ordenado por win rate</span>
              </div>
              <div className="space-y-2">
                {partnerStats.map((partner, idx) => (
                  <div
                    key={partner.userId}
                    className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-5">{idx + 1}.</span>
                      <span className="font-medium text-white">{partner.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">{partner.games} partidas</span>
                      <span className="text-green-400">{partner.wins}V</span>
                      <span className="text-red-400">{partner.games - partner.wins}D</span>
                      <span className={`font-bold w-12 text-right ${partner.winRate >= 0.5 ? "text-green-400" : "text-red-400"}`}>
                        {Math.round(partner.winRate * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Match list */}
          <div className="space-y-4">
            {matches.map((match, index) => {
              const inBlue = userId !== null && match.blueTeam.players.some((p) => p.userId === userId)
              const inRed = userId !== null && match.redTeam.players.some((p) => p.userId === userId)
              const myTeamId = inBlue ? match.blueTeam.id : inRed ? match.redTeam.id : null
              const blueWon = match.winnerId === match.blueTeam.id
              const redWon = match.winnerId === match.redTeam.id
              const pending = match.winnerId === null
              const iWon = myTeamId !== null && match.winnerId === myTeamId
              const date = new Date(match.dateCreated)

              return (
                <Card key={match.id} className={`border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm ${myTeamId !== null && !pending ? (iWon ? "border-l-2 border-l-green-500" : "border-l-2 border-l-red-500") : ""}`}>
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
                      {myTeamId !== null && !pending && (
                        <Badge className={iWon ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}>
                          {iWon ? "Vitória" : "Derrota"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className={`rounded-lg border p-4 ${blueWon ? "border-blue-500/50 bg-blue-500/5" : "border-gray-800/50 bg-gray-900/30"} ${inBlue ? "ring-1 ring-blue-500/30" : ""}`}>
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
                          <div key={player.userId} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${player.userId === userId ? "bg-blue-500/10" : "bg-black/30"}`}>
                            <span className={`font-medium ${player.userId === userId ? "text-blue-300" : "text-white"}`}>{player.name}</span>
                            {player.position && <span className="text-xs text-gray-500">{player.position}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`rounded-lg border p-4 ${redWon ? "border-red-500/50 bg-red-500/5" : "border-gray-800/50 bg-gray-900/30"} ${inRed ? "ring-1 ring-red-500/30" : ""}`}>
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
                          <div key={player.userId} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${player.userId === userId ? "bg-red-500/10" : "bg-black/30"}`}>
                            <span className={`font-medium ${player.userId === userId ? "text-red-300" : "text-white"}`}>{player.name}</span>
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
        </>
      )}
    </div>
  )
}
