"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, ChevronDown, Gamepad2, Radio, Swords, Timer, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/auth"
import { getLandingData } from "@/lib/services/landing"
import { Counter, Parallax, Reveal } from "./motion"
import { DiscordLobby } from "./discord-lobby"

const CAPABILITIES = [
  { icon: Swords, value: "12", label: "comandos no Discord" },
  { icon: Trophy, value: "5", label: "formatos de chave" },
  { icon: Gamepad2, value: "6", label: "jogos na competição" },
]

export function Hero() {
  const [totals, setTotals] = useState<{ matches: number; players: number } | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getLandingData(token)
      .then(({ players, totalMatches }) => setTotals({ matches: totalMatches, players: players.length }))
      .catch(() => setTotals(null))
  }, [])

  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28">
      {/* O escudo do Timbas é partido ao meio, azul de um lado e vermelho do
          outro. A luz do topo da página segue a mesma divisão. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-0 h-[620px] w-[620px] rounded-full bg-blue-600/20 blur-[150px]" />
        <div className="absolute -right-40 top-40 h-[560px] w-[560px] rounded-full bg-red-600/[0.16] blur-[150px]" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-white/[0.07] to-transparent" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="min-w-0">
            <Reveal>
              {/* O bordão da galera abrindo a página, antes de qualquer explicação. */}
              <p className="mb-6 flex items-center gap-3 text-[12px] font-black uppercase tracking-[0.24em] text-white sm:text-[13px]">
                <span aria-hidden className="h-px w-8 flex-shrink-0 bg-gradient-to-r from-blue-400 to-red-400" />
                É o Timbas, pai.
              </p>
            </Reveal>

            <Reveal delay={40}>
              <h1 className="font-display text-[clamp(2.6rem,7vw,4.6rem)] text-white">
                Tudo que a sua galera joga,{" "}
                <span className="bg-gradient-to-r from-blue-400 via-white to-red-400 bg-clip-text text-transparent">
                  num lugar só.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={80}>
              <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-gray-400">
                Partida personalizada de LoL sorteada no Discord, campeonato de qualquer jogo com chave que anda
                sozinha, liga draft de EA FC que busca o placar na própria EA, transmissão ao vivo para a galera
                assistir e um ranking que nasce do histórico, não do achismo.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="group h-12 bg-blue-600 px-7 text-[15px] font-bold shadow-lg shadow-blue-600/25 hover:bg-blue-500"
                >
                  <Link href="/dashboard">
                    Entrar com Discord
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/10 bg-white/[0.04] px-7 text-[15px] font-bold text-gray-300 backdrop-blur hover:bg-white/[0.08] hover:text-white"
                >
                  <a href="#tudo">Ver tudo que tem dentro</a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-white/[0.07] pt-7">
                {CAPABILITIES.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <item.icon className="h-4 w-4 text-gray-600" />
                    <span className="text-[15px] font-black tabular-nums text-white">{item.value}</span>
                    <span className="text-[12px] text-gray-500">{item.label}</span>
                  </div>
                ))}

                {totals && totals.matches > 0 && (
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-gray-600" />
                    <Counter to={totals.matches} className="text-[15px] font-black tabular-nums text-white" />
                    <span className="text-[12px] text-gray-500">partidas já registradas</span>
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          <div className="relative min-w-0">
            <Reveal delay={120} y={44}>
              <Parallax speed={0.05}>
                <DiscordLobby />
              </Parallax>
            </Reveal>

            {/* As outras áreas da plataforma espiando por cima do lobby. */}
            <FloatingChip
              className="-top-5 right-2 sm:-right-6"
              delay="0.4s"
              tone="border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300"
              icon={Gamepad2}
              title="Placar encontrado na EA"
              detail="Timbas FC 3 x 1 Vila Nova"
            />
            <FloatingChip
              className="bottom-16 -left-2 sm:-left-10"
              delay="1.6s"
              tone="border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
              icon={Timer}
              title="Draft ao vivo"
              detail="Fúria escolhe em 00:12"
            />
            <FloatingChip
              className="-bottom-6 right-4 sm:right-0"
              delay="2.6s"
              tone="border-rose-400/25 bg-rose-400/[0.08] text-rose-300"
              icon={Radio}
              title="Transmissão aberta"
              detail="14 assistindo agora"
            />
          </div>
        </div>

        <Reveal delay={300}>
          <a
            href="#tudo"
            className="mx-auto mt-16 flex w-fit flex-col items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 transition-colors hover:text-gray-300"
          >
            Role para ver
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}

function FloatingChip({
  className,
  delay,
  tone,
  icon: Icon,
  title,
  detail,
}: {
  className: string
  delay: string
  tone: string
  icon: typeof Gamepad2
  title: string
  detail: string
}) {
  return (
    <div
      className={`lp-float absolute z-10 hidden items-center gap-2.5 rounded-xl border bg-[#07070c]/85 px-3 py-2.5 shadow-xl shadow-black/50 backdrop-blur-md sm:flex ${className}`}
      style={{ "--float-delay": delay } as React.CSSProperties}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-[11.5px] font-bold text-white">{title}</span>
        <span className="block text-[10.5px] text-gray-500">{detail}</span>
      </span>
    </div>
  )
}
