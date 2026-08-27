"use client"

import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert, X } from "lucide-react"

export type ToastTone = "success" | "error" | "warning" | "info" | "loading"

interface Tone {
  icon: ReactNode
  /** Trilho da borda: é o estado e, ao mesmo tempo, o tempo que resta. */
  rail: string
  chip: string
  /** Luz que o trilho joga para dentro do card. */
  bleed: string
}

const TONES: Record<ToastTone, Tone> = {
  success: {
    icon: <CircleCheck className="h-[18px] w-[18px]" strokeWidth={2.25} />,
    rail: "from-emerald-200 via-emerald-400 to-emerald-500 shadow-[0_0_14px_rgba(52,211,153,0.55)]",
    chip: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
    bleed: "rgba(52,211,153,0.14)",
  },
  error: {
    icon: <CircleAlert className="h-[18px] w-[18px]" strokeWidth={2.25} />,
    rail: "from-red-200 via-red-400 to-red-500 shadow-[0_0_14px_rgba(248,113,113,0.55)]",
    chip: "bg-red-400/10 text-red-300 ring-red-400/25",
    bleed: "rgba(248,113,113,0.14)",
  },
  warning: {
    icon: <TriangleAlert className="h-[17px] w-[17px]" strokeWidth={2.25} />,
    rail: "from-amber-200 via-amber-400 to-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.55)]",
    chip: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    bleed: "rgba(251,191,36,0.14)",
  },
  info: {
    icon: <Info className="h-[18px] w-[18px]" strokeWidth={2.25} />,
    rail: "from-blue-200 via-blue-400 to-blue-500 shadow-[0_0_14px_rgba(96,165,250,0.55)]",
    chip: "bg-blue-400/10 text-blue-300 ring-blue-400/25",
    bleed: "rgba(96,165,250,0.14)",
  },
  loading: {
    icon: <Loader2 className="h-[17px] w-[17px] animate-spin" strokeWidth={2.25} />,
    rail: "from-white/50 via-white/30 to-white/20",
    chip: "bg-white/[0.06] text-gray-300 ring-white/15",
    bleed: "rgba(255,255,255,0.08)",
  },
}

export interface ToastCardProps {
  tone: ToastTone
  title: ReactNode
  description?: ReactNode
  /** Milissegundos até sumir. Infinity trava o trilho cheio. */
  duration: number
  onDismiss: () => void
}

export function ToastCard({ tone, title, description, duration, onDismiss }: ToastCardProps) {
  const palette = TONES[tone]
  const counts = Number.isFinite(duration) && duration > 0

  return (
    <div
      className={`tb-toast group pointer-events-auto relative flex w-full gap-3 overflow-hidden rounded-2xl bg-[#0a0b10]/95 py-3.5 pl-4 pr-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.08] backdrop-blur-xl ${
        description ? "items-start" : "items-center"
      }`}
    >
      {/* O trilho carrega duas informações de uma vez: a cor diz o que
          aconteceu, e o quanto ainda resta dele diz quanto tempo falta. */}
      <span className="absolute inset-y-0 left-0 w-[3px] overflow-hidden bg-white/[0.05]">
        <span
          className={`tb-toast-rail block h-full w-full origin-bottom bg-gradient-to-b ${palette.rail}`}
          style={counts ? ({ "--tb-toast-duration": `${duration}ms` } as React.CSSProperties) : undefined}
          data-counting={counts ? "true" : undefined}
        />
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-40"
        style={{ background: `radial-gradient(120% 100% at 0% 50%, ${palette.bleed}, transparent 70%)` }}
      />

      <span
        aria-hidden
        className={`tb-toast-icon relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${palette.chip}`}
      >
        {palette.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-snug text-white">{title}</p>
        {description && (
          <p className="mt-1 text-[11.5px] leading-relaxed text-gray-400">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso"
        className="relative -mr-1 flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-lg text-gray-600 opacity-70 transition hover:bg-white/[0.06] hover:text-gray-300 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none md:opacity-0 md:group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
