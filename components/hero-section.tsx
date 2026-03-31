"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Swords, Users, Server } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getRanking } from "@/lib/services/ranking"
import { getMatchHistory } from "@/lib/services/matches"

const DEFAULT_SERVER = "779382528821166100"

export function HeroSection() {
  const [totalMatches, setTotalMatches] = useState(0)
  const [totalPlayers, setTotalPlayers] = useState(0)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    Promise.all([
      getRanking(token, DEFAULT_SERVER).catch(() => []),
      getMatchHistory(token, DEFAULT_SERVER).catch(() => []),
    ]).then(([players, matches]) => {
      setTotalPlayers(players.length)
      setTotalMatches(matches.length)
    })
  }, [])

  return (
    <section className="relative flex min-h-screen items-center pt-16 overflow-hidden">
      <div className="container mx-auto px-4 py-20">
        <div className="grid items-center gap-16 lg:grid-cols-2 xl:gap-24">

          {/* ── Left ── */}
          <div className="flex flex-col">
            {/* Badge */}
            <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-4 py-2 text-sm text-blue-300">
              <Sparkles className="h-3.5 w-3.5" />
              Bot de Discord · League of Legends · 5v5
            </div>

            <h1 className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-[1.02] tracking-tight text-white">
              Organize partidas{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">épicas</span>
              </span>
              {" "}com<br />seus amigos
            </h1>

            <p className="mb-10 max-w-[480px] text-lg leading-relaxed text-gray-400">
              TimbasBot cria partidas 5v5 personalizadas direto no seu servidor Discord — com ranking, estatísticas detalhadas e histórico completo.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <Button
                size="lg"
                asChild
                className="group h-12 bg-blue-600 px-7 text-base font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
              >
                <Link href="/login">
                  Entrar com Discord
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 border-white/10 bg-white/[0.04] px-7 text-base font-semibold text-gray-300 hover:bg-white/[0.08] hover:text-white backdrop-blur-sm"
              >
                <a href="#features">Ver Features</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 border-t border-white/[0.07] pt-8">
              {[
                { value: totalMatches > 0 ? `${totalMatches}+` : "—", label: "Partidas jogadas", icon: Swords, color: "text-blue-400" },
                { value: totalPlayers > 0 ? `${totalPlayers}+` : "—", label: "Jogadores ativos", icon: Users, color: "text-red-400" },
                { value: "4", label: "Servidores", icon: Server, color: "text-purple-400" },
              ].map(({ value, label, icon: Icon, color }) => (
                <div key={label}>
                  <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <Icon className="h-3 w-3" />{label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right — Discord mockup ── */}
          <div className="relative flex items-center justify-center lg:justify-end">
            {/* Glow behind card */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-80 w-80 rounded-full bg-blue-600/20 blur-[80px]" />
              <div className="absolute h-60 w-60 rounded-full bg-red-600/15 blur-[80px] translate-x-16 translate-y-16" />
            </div>

            {/* Gradient border wrapper */}
            <div className="relative z-10 w-full max-w-[440px] rounded-[20px] p-[1px] bg-gradient-to-br from-blue-500/40 via-white/5 to-red-500/20 shadow-2xl shadow-black/50">
              {/* Discord window */}
              <div className="rounded-[19px] overflow-hidden bg-[#1e1f22]">
                {/* Title bar */}
                <div className="flex items-center gap-3 bg-[#1a1b1e] px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded overflow-hidden">
                        <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="" width={16} height={16} className="object-cover" />
                      </div>
                      <span className="text-xs font-semibold text-gray-300">TimbasBot</span>
                      <span className="rounded bg-blue-600/40 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 tracking-wide">BOT</span>
                    </div>
                  </div>
                  <div className="w-12" />
                </div>

                {/* Discord sidebar + content layout */}
                <div className="flex">
                  {/* Sidebar hint */}
                  <div className="w-12 flex-shrink-0 bg-[#1a1b1e] flex flex-col items-center py-3 gap-3 border-r border-white/[0.04]">
                    <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-blue-500/40">
                      <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="" width={32} height={32} className="object-cover" />
                    </div>
                    <div className="h-px w-6 bg-white/10" />
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-8 w-8 rounded-xl bg-white/[0.06]" />
                    ))}
                  </div>

                  {/* Screenshot */}
                  <div className="flex-1 bg-[#313338]">
                    <Image
                      src="/timbasBot.png"
                      alt="TimbasBot — partida personalizada no Discord"
                      width={560}
                      height={600}
                      className="w-full object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge — online */}
            <div className="absolute right-2 top-6 z-20 flex items-center gap-2 rounded-xl border border-green-500/20 bg-[#050508]/80 px-3 py-2 backdrop-blur-md shadow-xl">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <span className="text-xs font-semibold text-green-400">Online agora</span>
            </div>

            {/* Floating badge — partida */}
            <div className="absolute -left-4 bottom-12 z-20 rounded-xl border border-white/[0.08] bg-[#050508]/80 px-4 py-3 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-sm">⚔️</div>
                <div>
                  <div className="text-xs font-bold text-white">Partida iniciada</div>
                  <div className="text-[11px] text-gray-500">Azul 5 × 5 Vermelho</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
