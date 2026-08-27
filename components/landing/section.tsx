"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Parallax, Reveal } from "./motion"

export type LandingAccent = "blue" | "amber" | "cyan" | "emerald" | "rose" | "violet" | "indigo" | "gold"

type AccentTokens = {
  text: string
  dot: string
  chip: string
  line: string
  glow: string
}

export const LANDING_ACCENTS: Record<LandingAccent, AccentTokens> = {
  blue: {
    text: "text-blue-400",
    dot: "bg-blue-400",
    chip: "border-blue-400/25 bg-blue-400/[0.08] text-blue-300",
    line: "from-blue-400/60",
    glow: "bg-blue-600/20",
  },
  amber: {
    text: "text-amber-400",
    dot: "bg-amber-400",
    chip: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
    line: "from-amber-400/60",
    glow: "bg-amber-500/20",
  },
  cyan: {
    text: "text-cyan-400",
    dot: "bg-cyan-400",
    chip: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300",
    line: "from-cyan-400/60",
    glow: "bg-cyan-500/20",
  },
  emerald: {
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    chip: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
    line: "from-emerald-400/60",
    glow: "bg-emerald-500/20",
  },
  rose: {
    text: "text-rose-400",
    dot: "bg-rose-400",
    chip: "border-rose-400/25 bg-rose-400/[0.08] text-rose-300",
    line: "from-rose-400/60",
    glow: "bg-rose-500/20",
  },
  violet: {
    text: "text-violet-400",
    dot: "bg-violet-400",
    chip: "border-violet-400/25 bg-violet-400/[0.08] text-violet-300",
    line: "from-violet-400/60",
    glow: "bg-violet-500/20",
  },
  indigo: {
    text: "text-indigo-400",
    dot: "bg-indigo-400",
    chip: "border-indigo-400/25 bg-indigo-400/[0.08] text-indigo-300",
    line: "from-indigo-400/60",
    glow: "bg-indigo-500/20",
  },
  gold: {
    text: "text-yellow-400",
    dot: "bg-yellow-400",
    chip: "border-yellow-400/25 bg-yellow-400/[0.08] text-yellow-300",
    line: "from-yellow-400/60",
    glow: "bg-yellow-500/20",
  },
}

/// Uma seção, um assunto. Texto de um lado, a coisa acontecendo do outro, e a
/// cor entrando pela borda de onde a demonstração está.
export function StorySection({
  id,
  eyebrow,
  title,
  highlight,
  description,
  points,
  accent,
  media,
  reverse = false,
}: {
  id: string
  eyebrow: string
  title: string
  highlight: string
  description: string
  points: Array<{ icon: LucideIcon; title: string; text: string }>
  accent: LandingAccent
  media: ReactNode
  reverse?: boolean
}) {
  const tone = LANDING_ACCENTS[accent]

  return (
    <section id={id} className="relative scroll-mt-24 py-20 sm:py-28 lg:py-36">
      <div
        aria-hidden
        className={`pointer-events-none absolute top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full opacity-60 blur-[140px] ${tone.glow} ${
          reverse ? "-left-40" : "-right-40"
        }`}
      />

      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className={`min-w-0 ${reverse ? "lg:order-2" : ""}`}>
            <Reveal>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-bold ${tone.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {eyebrow}
              </span>
            </Reveal>

            <Reveal delay={60}>
              <h2 className="font-display mt-6 text-[clamp(2.1rem,4.4vw,3.4rem)] text-white">
                {title} <span className={tone.text}>{highlight}</span>
              </h2>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-gray-400">{description}</p>
            </Reveal>

            <ul className="mt-9 space-y-5">
              {points.map((point, index) => (
                <Reveal as="li" key={point.title} delay={180 + index * 70} className="flex gap-3.5">
                  <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${tone.chip}`}>
                    <point.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold text-white">{point.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-gray-500">{point.text}</span>
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className={`min-w-0 ${reverse ? "lg:order-1" : ""}`}>
            <Parallax speed={0.06}>
              <Reveal y={40} delay={100}>
                {media}
              </Reveal>
            </Parallax>
          </div>
        </div>
      </div>
    </section>
  )
}

/// Moldura das demonstrações: a mesma janela escura em toda a página, para as
/// telas parecerem partes do mesmo produto.
export function Frame({
  label,
  accent,
  children,
  className = "",
}: {
  label: string
  accent: LandingAccent
  children: ReactNode
  className?: string
}) {
  const tone = LANDING_ACCENTS[accent]

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0a10] shadow-2xl shadow-black/60 ${className}`}>
      <div className={`h-px w-full bg-gradient-to-r ${tone.line} via-white/10 to-transparent`} />
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </span>
        <span className="ml-1 font-mono text-[11px] text-gray-600">{label}</span>
      </div>
      <div className="lp-screen">{children}</div>
    </div>
  )
}
