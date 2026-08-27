"use client"

import Image from "next/image"
import { Download, Sparkles } from "lucide-react"
import { Parallax, Reveal } from "./motion"

const AWARDS = [
  { src: "/images/awards/muralha-template.png", label: "Muralha", hint: "menos gols sofridos" },
  { src: "/images/awards/garcom-template.png", label: "Garçom", hint: "mais assistências" },
  { src: "/images/awards/campeao-template-v3.png", label: "Campeão", hint: "quem levou a taça" },
  { src: "/images/awards/artilheiro-template-v12.png", label: "Artilheiro", hint: "mais gols na competição" },
  { src: "/images/awards/craque-template.png", label: "Craque", hint: "melhor em campo" },
]

/// Ângulo e altura de cada carta no leque. O do meio fica reto e maior, porque
/// campeão é campeão.
const FAN = [
  { rotate: -9, translate: 26, scale: 0.92 },
  { rotate: -4.5, translate: 10, scale: 0.96 },
  { rotate: 0, translate: -6, scale: 1.06 },
  { rotate: 4.5, translate: 10, scale: 0.96 },
  { rotate: 9, translate: 26, scale: 0.92 },
]

export function Awards() {
  return (
    <section id="premiacao" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.12] blur-[150px]"
      />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/[0.08] px-3.5 py-1.5 text-[12px] font-bold text-yellow-300">
              <Sparkles className="h-3.5 w-3.5" />
              Premiação
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="font-display mt-6 text-[clamp(2.1rem,4.6vw,3.4rem)] text-white">
              Todo campeonato termina com{" "}
              <span className="bg-gradient-to-r from-yellow-200 to-amber-500 bg-clip-text text-transparent">
                carta na mão.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={130}>
            <p className="mx-auto mt-5 max-w-[54ch] text-[15px] leading-relaxed text-gray-400">
              Quando a competição de EA FC fecha, a plataforma monta as cartas de premiação com os números reais da
              disputa. É só baixar e jogar no grupo para começar a discussão.
            </p>
          </Reveal>
        </div>

        <Parallax speed={0.05}>
          <div className="mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-8 sm:justify-center sm:gap-2 sm:overflow-visible sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {AWARDS.map((award, index) => {
              const fan = FAN[index]
              return (
                <Reveal key={award.label} delay={index * 90} y={36} className="snap-center">
                  <div
                    className="lp-fan w-[190px] flex-shrink-0 sm:w-[200px]"
                    style={
                      {
                        "--fan-rotate": `${fan.rotate}deg`,
                        "--fan-y": `${fan.translate}px`,
                        "--fan-scale": fan.scale,
                      } as React.CSSProperties
                    }
                  >
                    <figure className="group transition-transform duration-500 ease-out hover:-translate-y-3">
                      <div className="overflow-hidden rounded-2xl border border-yellow-500/20 bg-black shadow-2xl shadow-black/70 transition-shadow duration-500 group-hover:shadow-yellow-900/40">
                        <Image
                          src={award.src}
                          alt={`Carta de premiação: ${award.label}`}
                          width={400}
                          height={500}
                          sizes="200px"
                          className="h-auto w-full object-cover"
                        />
                      </div>
                      <figcaption className="mt-3 text-center">
                        <span className="block text-[13px] font-black text-white">{award.label}</span>
                        <span className="block text-[11px] text-gray-500">{award.hint}</span>
                      </figcaption>
                    </figure>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </Parallax>

        <Reveal delay={200}>
          <p className="mx-auto mt-10 flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-gray-400">
            <Download className="h-3.5 w-3.5 text-yellow-400" />
            Campeonato encerrado, aba de estatísticas, botão de baixar em cada carta
          </p>
        </Reveal>
      </div>
    </section>
  )
}
