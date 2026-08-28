"use client"

import {
  Brain,
  ClipboardList,
  Gamepad2,
  Radio,
  ShieldCheck,
  Swords,
  Trophy,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { Reveal } from "./motion"
import { LANDING_ACCENTS, type LandingAccent } from "./section"

const PILLARS: Array<{
  icon: LucideIcon
  title: string
  text: string
  accent: LandingAccent
  href: string
}> = [
  {
    icon: Swords,
    title: "Partida personalizada",
    text: "Sala no Discord, times sorteados e placar registrado sozinho.",
    accent: "blue",
    href: "#partidas",
  },
  {
    icon: Trophy,
    title: "Campeonatos",
    text: "Chave de qualquer jogo, de eliminação simples a grupos e mata-mata.",
    accent: "amber",
    href: "#campeonatos",
  },
  {
    icon: Gamepad2,
    title: "EA FC automático",
    text: "O servidor procura a partida na EA e fecha o placar sem ninguém digitar.",
    accent: "cyan",
    href: "#ea",
  },
  {
    icon: ClipboardList,
    title: "Liga Draft",
    text: "Draft ao vivo, montagem de elenco, rodadas e disputa entre amigos.",
    accent: "emerald",
    href: "#draft",
  },
  {
    icon: Radio,
    title: "Transmissões",
    text: "Abra a sua tela para a galera assistir e o bot avisa no canal.",
    accent: "rose",
    href: "#transmissoes",
  },
  {
    icon: Brain,
    title: "Rift Tools",
    text: "Scout do time adversário no Clash, conta da Riot e leitura de perfil.",
    accent: "violet",
    href: "#rift",
  },
  {
    icon: ShieldCheck,
    title: "Bot no Discord",
    text: "Doze comandos, votação de MVP na DM e recap depois da partida.",
    accent: "indigo",
    href: "#bot",
  },
  {
    icon: Sparkles,
    title: "Conquistas e história",
    text: "Classificação por temporada, conquistas e hall da fama.",
    accent: "gold",
    href: "#ranking",
  },
]

export function Overview() {
  return (
    <section id="tudo" className="relative scroll-mt-24 border-t border-white/[0.05] py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-bold text-gray-400">
              Panorama
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="font-display mt-6 text-[clamp(2.2rem,5vw,3.6rem)] text-white">
              Começou como um bot de partida.{" "}
              <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
                Virou a temporada inteira.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={130}>
            <p className="mx-auto mt-5 max-w-[58ch] text-[15px] leading-relaxed text-gray-400">
              Cada bloco daqui para baixo explica uma parte. Tudo divide a mesma conta do Discord, o mesmo ranking e a
              mesmo perfil, então nada precisa ser combinado duas vezes.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, index) => {
            const tone = LANDING_ACCENTS[pillar.accent]
            return (
              <Reveal key={pillar.title} delay={index * 60}>
                <a
                  href={pillar.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.045]"
                >
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r ${tone.line} to-transparent transition-transform duration-500 group-hover:scale-x-100`}
                  />
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone.chip}`}>
                    <pillar.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="mt-4 text-[14px] font-black text-white">{pillar.title}</span>
                  <span className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500">{pillar.text}</span>
                </a>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
