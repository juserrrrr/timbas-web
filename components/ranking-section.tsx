"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, ChevronLeft, ChevronRight } from "lucide-react"
import { LoadingState } from "@/components/ui/loading-state"
import { useServer, SERVERS } from "@/lib/server-context"
import { PlayerAvatar } from "@/components/player-avatar"
import { apiFetch, authHeaders } from "@/lib/api"
import { getToken } from "@/lib/auth"
import type { PlayerStats } from "@/lib/server-context"

const MODE_TABS = [
  { label: "Geral", value: undefined },
  { label: "1v1", value: 1 },
  { label: "3v3", value: 3 },
  { label: "5v5", value: 5 },
] as const

interface Props {
  initialPlayers?: PlayerStats[]
}

export function RankingSection({ initialPlayers = [] }: Props) {
  const { selectedServer } = useServer()
  const [mode, setMode] = useState<number | undefined>(undefined)
  const [players, setPlayers] = useState<PlayerStats[]>(initialPlayers)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const playersPerPage = 10

  useEffect(() => {
    const token = getToken()
    if (!selectedServer || !token) return
    setCurrentPage(1)
    setIsLoading(true)
    const url = mode !== undefined
      ? `${process.env.NEXT_PUBLIC_API_URL}/leaderboard/${selectedServer}?mode=${mode}`
      : `${process.env.NEXT_PUBLIC_API_URL}/leaderboard/${selectedServer}`
    apiFetch(url, { headers: authHeaders(token) })
      .then(res => res.json())
      .then(setPlayers)
      .catch(() => setPlayers([]))
      .finally(() => setIsLoading(false))
  }, [selectedServer, mode])

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

  const selectedServerName = SERVERS.find((s) => s.id === selectedServer)?.name || "Servidor"

  return (
    <div className="animate-in fade-in duration-700 space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-4xl font-bold md:text-5xl">
          Ranking{" "}
          <span className="bg-gradient-to-r from-blue-500 to-red-500 bg-clip-text text-transparent">
            {selectedServerName}
          </span>
        </h1>
        <p className="text-gray-400">Os melhores jogadores da temporada</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {MODE_TABS.map((tab) => (
          <button
            key={String(tab.value)}
            onClick={() => setMode(tab.value)}
            className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              mode === tab.value
                ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                : "border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/[0.1] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <LoadingState className="min-h-[200px]" />
      )}

      {!isLoading && players.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-300">Ranking Vazio</h2>
          <p className="mt-2 text-gray-400">Ainda não há dados de ranking para este servidor.</p>
        </div>
      ) : !isLoading && (
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
                  <PlayerAvatar name={topThree[1].name} discordId={topThree[1].discordId} avatar={topThree[1].avatar} size={128} className="h-16 w-16 border-2 border-gray-400" />
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
                      <PlayerAvatar name={topThree[0].name} discordId={topThree[0].discordId} avatar={topThree[0].avatar} size={128} className="h-20 w-20 border-4 border-yellow-400" />
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
                  <PlayerAvatar name={topThree[2].name} discordId={topThree[2].discordId} avatar={topThree[2].avatar} size={128} className="h-16 w-16 border-2 border-amber-600" />
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
                            <PlayerAvatar name={player.name} discordId={player.discordId} avatar={player.avatar} size={64} className="h-10 w-10" />
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


