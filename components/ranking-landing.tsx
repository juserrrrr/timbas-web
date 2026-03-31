"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy, ArrowRight, Medal, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { getRanking, PlayerStats } from "@/lib/services/ranking"
import { getToken } from "@/lib/auth"

const SERVERS = [
  { id: "779382528821166100", name: "Timbas" },
  { id: "465211051865276426", name: "Entrosa Não" },
  { id: "1187881256508211321", name: "Fusão" },
]

const MEDAL_STYLE = [
  { label: "1º", color: "text-yellow-400", border: "border-yellow-500/40", bg: "bg-yellow-500/10" },
  { label: "2º", color: "text-gray-300", border: "border-gray-400/40", bg: "bg-gray-400/10" },
  { label: "3º", color: "text-amber-600", border: "border-amber-600/40", bg: "bg-amber-600/10" },
]

export function RankingLanding() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)

  useEffect(() => {
    const token = getToken()
    setIsAuth(!!token)
    if (!token) { setIsLoading(false); return }

    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getRanking(token, selectedServer)
        setPlayers(data)
      } catch {
        setPlayers([])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [selectedServer])

  const top3 = players.slice(0, 3)
  const rest = players.slice(3, 8)

  return (
    <section id="ranking" className="relative py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <span className="mb-2 inline-block rounded-full border border-gray-700 bg-gray-800/50 px-4 py-1.5 text-sm text-gray-400">
              Ao vivo
            </span>
            <h2 className="text-4xl font-bold text-white md:text-5xl">
              Ranking{" "}
              <span className="bg-gradient-to-r from-blue-500 to-red-500 bg-clip-text text-transparent">
                {SERVERS.find((s) => s.id === selectedServer)?.name}
              </span>
            </h2>
            <p className="mt-2 text-gray-400">Os melhores jogadores da temporada</p>
          </div>

          {isAuth && (
            <Select value={selectedServer} onValueChange={setSelectedServer}>
              <SelectTrigger className="w-[200px] border-gray-700 bg-gray-800/50 text-white">
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
          )}
        </div>

        {/* Not logged in */}
        {!isAuth && (
          <div className="relative overflow-hidden rounded-2xl border border-gray-800/60 bg-gray-900/30 backdrop-blur-sm">
            {/* Blurred fake data */}
            <div className="pointer-events-none select-none p-8 blur-sm opacity-40">
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{i}º</div>
                    <div className="h-16 w-16 rounded-full bg-gray-600 mx-auto mb-3" />
                    <div className="h-4 bg-gray-600 rounded mx-auto w-24 mb-2" />
                    <div className="h-3 bg-gray-700 rounded mx-auto w-16" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-800/30 p-4">
                    <div className="h-8 w-8 rounded-full bg-gray-700" />
                    <div className="h-4 flex-1 bg-gray-700 rounded" />
                    <div className="h-4 w-16 bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
                <Lock className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ranking em tempo real</h3>
              <p className="text-gray-400 text-sm mb-6 text-center max-w-xs">
                Faça login com seu Discord para ver o ranking completo com dados reais.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30">
                <Link href="/login">
                  Entrar com Discord
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isAuth && isLoading && (
          <div className="flex items-center justify-center h-64">
            <Spinner className="size-8 text-blue-500" />
          </div>
        )}

        {/* Real data */}
        {isAuth && !isLoading && players.length > 0 && (
          <div className="space-y-6">
            {/* Top 3 */}
            <div className="grid gap-4 md:grid-cols-3">
              {top3.map((player, idx) => {
                const style = MEDAL_STYLE[idx]
                return (
                  <div
                    key={player.userId}
                    className={`relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-6 backdrop-blur-sm ${idx === 0 ? "md:order-2 scale-100 md:scale-105" : idx === 1 ? "md:order-1" : "md:order-3"}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Medal className={`h-7 w-7 ${style.color}`} />
                      <span className={`text-3xl font-black ${style.color}`}>{style.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className={`h-14 w-14 border-2 ${style.border}`}>
                        <AvatarFallback className="bg-gray-800 text-white font-bold text-lg">
                          {player.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{player.name}</h3>
                        <p className="text-sm text-gray-400">{player.score} pts</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-lg bg-black/30 p-2">
                        <div className="font-bold text-white">{player.totalGames}</div>
                        <div className="text-xs text-gray-500">Partidas</div>
                      </div>
                      <div className="rounded-lg bg-black/30 p-2">
                        <div className="font-bold text-green-400">{player.wins}</div>
                        <div className="text-xs text-gray-500">Vitórias</div>
                      </div>
                      <div className="rounded-lg bg-black/30 p-2">
                        <div className="font-bold text-white">{Math.round(player.winRate * 100)}%</div>
                        <div className="text-xs text-gray-500">Win Rate</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rest */}
            {rest.length > 0 && (
              <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 overflow-hidden backdrop-blur-sm">
                {rest.map((player, idx) => (
                  <div
                    key={player.userId}
                    className="flex items-center gap-4 px-6 py-4 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-gray-300">
                      {player.rank}
                    </span>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gray-700 text-sm font-bold text-white">
                        {player.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium text-white">{player.name}</span>
                    <span className="text-sm text-blue-400 font-semibold">{player.score} pts</span>
                    <span className="text-sm text-gray-400 hidden sm:block">{player.totalGames} partidas</span>
                    <span className={`text-sm font-bold w-12 text-right ${player.winRate >= 0.5 ? "text-green-400" : "text-red-400"}`}>
                      {Math.round(player.winRate * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* See full ranking CTA */}
            <div className="flex justify-center pt-2">
              <Button variant="outline" asChild className="border-gray-700 bg-gray-800/50 text-white hover:bg-gray-800">
                <Link href="/dashboard/ranking">
                  <Trophy className="mr-2 h-4 w-4" />
                  Ver ranking completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* No data */}
        {isAuth && !isLoading && players.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/30 p-16 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">Nenhum dado disponível para este servidor.</p>
          </div>
        )}
      </div>
    </section>
  )
}
