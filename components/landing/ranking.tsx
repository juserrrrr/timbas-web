"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Crown, Lock, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import { getLandingData } from "@/lib/services/landing"
import type { PlayerStats } from "@/lib/services/ranking"
import { TIMBAS_SERVER_NAME } from "@/lib/servers"
import { Reveal } from "./motion"

const PODIUM = [
  { label: "1º", text: "text-yellow-300", border: "border-yellow-400/30", bg: "bg-yellow-400/[0.08]" },
  { label: "2º", text: "text-gray-200", border: "border-white/[0.14]", bg: "bg-white/[0.04]" },
  { label: "3º", text: "text-amber-500", border: "border-amber-600/30", bg: "bg-amber-600/[0.08]" },
]

export function RankingLive() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = getToken()
    setAuthed(Boolean(token))
    if (!token) {
      setLoading(false)
      return
    }
    getLandingData(token)
      .then((data) => setPlayers(data.players))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false))
  }, [])

  const top3 = players.slice(0, 3)
  const rest = players.slice(3, 8)

  return (
    <section id="ranking" className="relative scroll-mt-24 border-t border-white/[0.05] py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-bold text-gray-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
                </span>
                Dados de agora
              </span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="font-display mt-5 text-[clamp(2rem,4.4vw,3.2rem)] text-white">
                Ranking do{" "}
                <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
                  {TIMBAS_SERVER_NAME}
                </span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-2 text-[14px] text-gray-500">
                Sai direto do histórico de partidas, e a temporada aberta manda no recorte.
              </p>
            </Reveal>
          </div>

          {authed && players.length > 0 && (
            <Reveal delay={160}>
              <Button asChild variant="outline" className="border-white/10 bg-white/[0.04] text-gray-200">
                <Link href="/dashboard/ranking">
                  Ver ranking completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
          )}
        </div>

        {!authed && (
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <div aria-hidden className="pointer-events-none select-none p-6 opacity-30 blur-[3px]">
                <div className="mb-3 grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
                  ))}
                </div>
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="h-11 rounded-xl border border-white/[0.05] bg-white/[0.03]" />
                  ))}
                </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 px-6 text-center backdrop-blur-[2px]">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/15">
                  <Lock className="h-6 w-6 text-blue-400" />
                </span>
                <div>
                  <p className="text-[16px] font-black text-white">O ranking é da comunidade</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-gray-400">
                    Entre com o Discord para ver a classificação real, com vitórias, MVPs e aproveitamento de cada um.
                  </p>
                </div>
                <Button asChild className="bg-blue-600 font-bold shadow-lg shadow-blue-600/25 hover:bg-blue-500">
                  <Link href="/dashboard">
                    Entrar com Discord
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        )}

        {authed && loading && (
          <div className="flex h-56 items-center justify-center">
            <Spinner className="size-7 text-blue-500" />
          </div>
        )}

        {authed && !loading && players.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-14 text-center">
            <Trophy className="mx-auto mb-3 h-9 w-9 text-gray-700" />
            <p className="text-[14px] text-gray-500">Ainda não há partida registrada para montar o ranking.</p>
          </div>
        )}

        {authed && !loading && players.length > 0 && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {top3.map((player, index) => {
                const style = PODIUM[index]
                return (
                  <Reveal key={player.userId} delay={index * 80}>
                    <div className={`relative overflow-hidden rounded-2xl border p-5 ${style.border} ${style.bg}`}>
                      <div className="flex items-start justify-between">
                        <span className={`font-display text-[34px] ${style.text}`}>{style.label}</span>
                        {index === 0 && <Crown className="h-5 w-5 text-yellow-300" />}
                      </div>
                      <p className="mt-3 truncate text-[16px] font-black text-white">{player.name}</p>
                      <p className="text-[12px] text-gray-500">{player.score} pontos</p>
                      <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
                        {[
                          { value: player.wins, label: "vitórias" },
                          { value: player.mvpCount, label: "MVPs" },
                          { value: `${Math.round(player.winRate * 100)}%`, label: "aproveita." },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-lg bg-black/30 py-2">
                            <span className="block text-[13px] font-black tabular-nums text-white">{stat.value}</span>
                            <span className="block text-[10px] text-gray-500">{stat.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>

            {rest.length > 0 && (
              <Reveal delay={120}>
                <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
                  {rest.map((player) => (
                    <div
                      key={player.userId}
                      className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0 sm:px-5"
                    >
                      <span className="w-6 flex-shrink-0 text-[12px] font-black text-gray-600">{player.rank}º</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">{player.name}</span>
                      <span className="hidden text-[11px] text-gray-500 sm:block">{player.totalGames} partidas</span>
                      <span className="hidden text-[11px] text-yellow-400/80 sm:block">{player.mvpCount} MVPs</span>
                      <span className="w-12 text-right font-mono text-[12px] font-bold tabular-nums text-blue-400">
                        {player.score}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
