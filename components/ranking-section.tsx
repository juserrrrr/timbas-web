"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, ChevronLeft, ChevronRight, Server } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { Skeleton } from "@/components/ui/skeleton"

// Mock data for servers - this could also come from an API
const mockServers = [
  { id: "779382528821166100", name: "Galera do LoL", icon: "/user-avatar.jpg" },
  { id: "2", name: "Pro Players BR", icon: "/user-avatar.jpg" },
  { id: "3", name: "Amigos da Ranked", icon: "/user-avatar.jpg" },
  { id: "4", name: "TimbasBot Official", icon: "/user-avatar.jpg" },
]

export function RankingSection() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedServer, setSelectedServer] = useState(mockServers[0].id)
  const playersPerPage = 10

  useEffect(() => {
    const fetchRanking = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = process.env.NEXT_PUBLIC_API_TOKEN;
        if (!token) {
          throw new Error("NEXT_PUBLIC_API_TOKEN não está definido nas variáveis de ambiente.");
        }
        const data = await getRanking(token, selectedServer)
        setPlayers(data)
      } catch (err) {
        setError("Falha ao carregar o ranking. Tente novamente mais tarde.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRanking()
  }, [selectedServer])

  const totalPages = Math.ceil(Math.max(0, players.length - 3) / playersPerPage)
  const topThree = players.slice(0, 3)
  const remainingPlayers = players.slice(3)
  const startIndex = (currentPage - 1) * playersPerPage
  const endIndex = startIndex + playersPerPage
  const currentPlayers = remainingPlayers.slice(startIndex, endIndex)

  const getMedalColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-400"
      case 2:
        return "text-gray-300"
      case 3:
        return "text-amber-600"
      default:
        return "text-gray-400"
    }
  }

  const getMedalBg = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-500/20 border-yellow-500/30"
      case 2:
        return "bg-gray-400/20 border-gray-400/30"
      case 3:
        return "bg-amber-600/20 border-amber-600/30"
      default:
        return "bg-gray-800/20 border-gray-700/30"
    }
  }

  const selectedServerName = mockServers.find((s) => s.id === selectedServer)?.name || "Servidor"

  if (isLoading) {
    return <RankingSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-red-500/50 bg-red-500/10 p-12 text-center">
        <h2 className="text-xl font-semibold text-red-400">Ocorreu um erro</h2>
        <p className="mt-2 text-gray-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Server Selector */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-center md:text-left">
          <h1 className="mb-2 text-4xl font-bold md:text-5xl">
            Ranking{" "}
            <span className="bg-gradient-to-r from-blue-500 to-red-500 bg-clip-text text-transparent">
              {selectedServerName}
            </span>
          </h1>
          <p className="text-gray-400">Os melhores jogadores da temporada</p>
        </div>
        <div className="w-full md:w-auto">
          <Select value={selectedServer} onValueChange={setSelectedServer}>
            <SelectTrigger className="w-full border-gray-700 bg-gray-800/50 text-white md:w-[280px]">
              <Server className="mr-2 h-4 w-4 text-blue-400" />
              <SelectValue placeholder="Selecione um servidor" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900 text-white">
              {mockServers.map((server) => (
                <SelectItem key={server.id} value={server.id} className="focus:bg-gray-800 focus:text-white">
                  <div className="flex items-center gap-2">
                    <img src={server.icon || "/user-avatar.jpg"} alt={server.name} className="h-5 w-5 rounded-full" />
                    <span>{server.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-300">Ranking Vazio</h2>
          <p className="mt-2 text-gray-400">Ainda não há dados de ranking para este servidor.</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Render top 3 players, checking if they exist */}
            {topThree[1] && (
              <Card className={`order-2 border p-6 backdrop-blur-sm md:order-1 ${getMedalBg(2)}`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-400/20">
                    <Medal className={`h-7 w-7 ${getMedalColor(2)}`} />
                  </div>
                  <span className="text-3xl font-bold text-gray-300">2º</span>
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-16 w-16 border-2 border-gray-400">
                    <AvatarImage src={"/user-avatar.jpg"} alt={topThree[1].name} />
                    <AvatarFallback>{topThree[1].name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold text-white">{topThree[1].name}</h3>
                    <p className="text-sm text-gray-400">{topThree[1].score} pts</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold">{topThree[1].totalGames}</div>
                    <div className="text-xs text-gray-400">Partidas</div>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold">{Math.round(topThree[1].winRate * 100)}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold text-green-400">{topThree[1].wins}V</div>
                    <div className="text-xs text-gray-400">Vitórias</div>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold text-red-400">{topThree[1].losses}D</div>
                    <div className="text-xs text-gray-400">Derrotas</div>
                  </div>
                </div>
              </Card>
            )}
            {topThree[0] && (
              <div className="order-1 scale-105 md:order-2">
                <Card className={`p-6 backdrop-blur-sm border ${getMedalBg(1)}`}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/20">
                      <Trophy className={`h-8 w-8 ${getMedalColor(1)}`} />
                    </div>
                    <span className="text-4xl font-bold text-yellow-400">1º</span>
                  </div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rotating-border-glow rounded-full">
                      <Avatar className="h-20 w-20 border-4 border-yellow-400">
                        <AvatarImage src={"/user-avatar.jpg"} alt={topThree[0].name} />
                        <AvatarFallback>{topThree[0].name[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{topThree[0].name}</h3>
                      <p className="text-sm text-gray-400">{topThree[0].score} pts</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-black/30 p-2 text-center">
                      <div className="font-semibold">{topThree[0].totalGames}</div>
                      <div className="text-xs text-gray-400">Partidas</div>
                    </div>
                    <div className="rounded-lg bg-black/30 p-2 text-center">
                      <div className="font-semibold">{Math.round(topThree[0].winRate * 100)}%</div>
                      <div className="text-xs text-gray-400">Win Rate</div>
                    </div>
                    <div className="rounded-lg bg-black/30 p-2 text-center">
                      <div className="font-semibold text-green-400">{topThree[0].wins}V</div>
                      <div className="text-xs text-gray-400">Vitórias</div>
                    </div>
                    <div className="rounded-lg bg-black/30 p-2 text-center">
                      <div className="font-semibold text-red-400">{topThree[0].losses}D</div>
                      <div className="text-xs text-gray-400">Derrotas</div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            {topThree[2] && (
              <Card className={`order-3 border p-6 backdrop-blur-sm ${getMedalBg(3)}`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600/20">
                    <Medal className={`h-7 w-7 ${getMedalColor(3)}`} />
                  </div>
                  <span className="text-3xl font-bold text-amber-600">3º</span>
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-16 w-16 border-2 border-amber-600">
                    <AvatarImage src={"/user-avatar.jpg"} alt={topThree[2].name} />
                    <AvatarFallback>{topThree[2].name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold text-white">{topThree[2].name}</h3>
                    <p className="text-sm text-gray-400">{topThree[2].score} pts</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                   <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold">{topThree[2].totalGames}</div>
                    <div className="text-xs text-gray-400">Partidas</div>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold">{Math.round(topThree[2].winRate * 100)}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold text-green-400">{topThree[2].wins}V</div>
                    <div className="text-xs text-gray-400">Vitórias</div>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2 text-center">
                    <div className="font-semibold text-red-400">{topThree[2].losses}D</div>
                    <div className="text-xs text-gray-400">Derrotas</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Remaining Rankings */}
          <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="p-4 font-medium">Posição</th>
                    <th className="p-4 font-medium">Jogador</th>
                    <th className="p-4 font-medium">Pontos</th>
                    <th className="p-4 font-medium">V/D</th>
                    <th className="p-4 font-medium">Partidas</th>
                    <th className="p-4 font-medium">Win Rate</th>
                    <th className="p-4 font-medium">Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPlayers.map((player, index) => {
                    return (
                      <tr key={player.userId} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                        <td className="p-4">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 font-semibold text-white">
                            {player.rank}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={"/user-avatar.jpg"} alt={player.name} />
                              <AvatarFallback>{player.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-white">{player.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-blue-400">{player.score}</td>
                        <td className="p-4">
                          <span className="text-green-400">{player.wins}</span>
                          <span className="text-gray-500"> / </span>
                          <span className="text-red-400">{player.losses}</span>
                        </td>
                        <td className="p-4 font-medium text-white">{player.totalGames}</td>
                        <td className="p-4 font-medium text-white">{Math.round(player.winRate * 100)}%</td>
                        <td className="p-4">
                          {/* Trend data is not available in the new API, so this is removed */}
                          <span className="text-gray-500">—</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-800 p-4">
              <div className="text-sm text-gray-400">
                Mostrando {startIndex + 1}-{Math.min(endIndex, remainingPlayers.length)} de {remainingPlayers.length}{" "}
                jogadores
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-white">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function RankingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-12 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-56" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

