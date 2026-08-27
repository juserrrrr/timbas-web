"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight, ChevronLeft, type LucideIcon } from "lucide-react"

/// Vocabulário visual do painel. Cada área tem uma cor, a mesma que aparece no
/// menu lateral, e ela volta no cabeçalho, na aba ativa e na barrinha à
/// esquerda de cada bloco. É assim que a pessoa sabe onde está sem ler o
/// título.
export type AdminAccent =
  | "orange"
  | "amber"
  | "emerald"
  | "blue"
  | "violet"
  | "fuchsia"
  | "sky"
  | "rose"
  | "cyan"
  | "slate"

type AccentTokens = {
  text: string
  soft: string
  chip: string
  bar: string
  glow: string
  tab: string
  ring: string
  solid: string
  outline: string
}

export const ADMIN_ACCENTS: Record<AdminAccent, AccentTokens> = {
  orange: {
    text: "text-orange-400",
    soft: "text-orange-300",
    chip: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    bar: "bg-orange-400",
    glow: "shadow-[0_0_38px_-14px] shadow-orange-500/60",
    tab: "data-[state=active]:bg-orange-500/12 data-[state=active]:text-orange-200 data-[state=active]:border-orange-400/25",
    ring: "border-orange-400/25 bg-orange-400/[0.07]",
    solid: "bg-orange-500 text-black hover:bg-orange-400",
    outline: "border-orange-400/25 text-orange-300 hover:bg-orange-500/10",
  },
  amber: {
    text: "text-amber-400",
    soft: "text-amber-300",
    chip: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    bar: "bg-amber-400",
    glow: "shadow-[0_0_38px_-14px] shadow-amber-500/60",
    tab: "data-[state=active]:bg-amber-500/12 data-[state=active]:text-amber-200 data-[state=active]:border-amber-400/25",
    ring: "border-amber-400/25 bg-amber-400/[0.07]",
    solid: "bg-amber-500 text-black hover:bg-amber-400",
    outline: "border-amber-400/25 text-amber-300 hover:bg-amber-500/10",
  },
  emerald: {
    text: "text-emerald-400",
    soft: "text-emerald-300",
    chip: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    bar: "bg-emerald-400",
    glow: "shadow-[0_0_38px_-14px] shadow-emerald-500/60",
    tab: "data-[state=active]:bg-emerald-500/12 data-[state=active]:text-emerald-200 data-[state=active]:border-emerald-400/25",
    ring: "border-emerald-400/25 bg-emerald-400/[0.07]",
    solid: "bg-emerald-500 text-black hover:bg-emerald-400",
    outline: "border-emerald-400/25 text-emerald-300 hover:bg-emerald-500/10",
  },
  blue: {
    text: "text-blue-400",
    soft: "text-blue-300",
    chip: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    bar: "bg-blue-400",
    glow: "shadow-[0_0_38px_-14px] shadow-blue-500/60",
    tab: "data-[state=active]:bg-blue-500/12 data-[state=active]:text-blue-200 data-[state=active]:border-blue-400/25",
    ring: "border-blue-400/25 bg-blue-400/[0.07]",
    solid: "bg-blue-500 text-white hover:bg-blue-400",
    outline: "border-blue-400/25 text-blue-300 hover:bg-blue-500/10",
  },
  violet: {
    text: "text-violet-400",
    soft: "text-violet-300",
    chip: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    bar: "bg-violet-400",
    glow: "shadow-[0_0_38px_-14px] shadow-violet-500/60",
    tab: "data-[state=active]:bg-violet-500/12 data-[state=active]:text-violet-200 data-[state=active]:border-violet-400/25",
    ring: "border-violet-400/25 bg-violet-400/[0.07]",
    solid: "bg-violet-600 text-white hover:bg-violet-500",
    outline: "border-violet-400/25 text-violet-300 hover:bg-violet-500/10",
  },
  fuchsia: {
    text: "text-fuchsia-400",
    soft: "text-fuchsia-300",
    chip: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400",
    bar: "bg-fuchsia-400",
    glow: "shadow-[0_0_38px_-14px] shadow-fuchsia-500/60",
    tab: "data-[state=active]:bg-fuchsia-500/12 data-[state=active]:text-fuchsia-200 data-[state=active]:border-fuchsia-400/25",
    ring: "border-fuchsia-400/25 bg-fuchsia-400/[0.07]",
    solid: "bg-fuchsia-600 text-white hover:bg-fuchsia-500",
    outline: "border-fuchsia-400/25 text-fuchsia-300 hover:bg-fuchsia-500/10",
  },
  sky: {
    text: "text-sky-400",
    soft: "text-sky-300",
    chip: "bg-sky-500/10 border-sky-500/20 text-sky-400",
    bar: "bg-sky-400",
    glow: "shadow-[0_0_38px_-14px] shadow-sky-500/60",
    tab: "data-[state=active]:bg-sky-500/12 data-[state=active]:text-sky-200 data-[state=active]:border-sky-400/25",
    ring: "border-sky-400/25 bg-sky-400/[0.07]",
    solid: "bg-sky-500 text-black hover:bg-sky-400",
    outline: "border-sky-400/25 text-sky-300 hover:bg-sky-500/10",
  },
  rose: {
    text: "text-rose-400",
    soft: "text-rose-300",
    chip: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    bar: "bg-rose-400",
    glow: "shadow-[0_0_38px_-14px] shadow-rose-500/60",
    tab: "data-[state=active]:bg-rose-500/12 data-[state=active]:text-rose-200 data-[state=active]:border-rose-400/25",
    ring: "border-rose-400/25 bg-rose-400/[0.07]",
    solid: "bg-rose-600 text-white hover:bg-rose-500",
    outline: "border-rose-400/25 text-rose-300 hover:bg-rose-500/10",
  },
  cyan: {
    text: "text-cyan-400",
    soft: "text-cyan-300",
    chip: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    bar: "bg-cyan-400",
    glow: "shadow-[0_0_38px_-14px] shadow-cyan-500/60",
    tab: "data-[state=active]:bg-cyan-500/12 data-[state=active]:text-cyan-200 data-[state=active]:border-cyan-400/25",
    ring: "border-cyan-400/25 bg-cyan-400/[0.07]",
    solid: "bg-cyan-500 text-black hover:bg-cyan-400",
    outline: "border-cyan-400/25 text-cyan-300 hover:bg-cyan-500/10",
  },
  slate: {
    text: "text-slate-300",
    soft: "text-slate-200",
    chip: "bg-white/[0.05] border-white/10 text-slate-300",
    bar: "bg-slate-300",
    glow: "shadow-[0_0_38px_-14px] shadow-white/40",
    tab: "data-[state=active]:bg-white/[0.07] data-[state=active]:text-white data-[state=active]:border-white/15",
    ring: "border-white/12 bg-white/[0.04]",
    solid: "bg-white/10 text-white hover:bg-white/15",
    outline: "border-white/12 text-gray-300 hover:bg-white/[0.06]",
  },
}

/// Cabeçalho de página. O selo colorido tem um brilho fraco por trás e a régua
/// abaixo do bloco nasce na cor da área e apaga para a direita: é o único
/// enfeite da página, e ele repete em toda tela do painel.
export function AdminHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  accent = "orange",
  actions,
  backHref,
  backLabel,
}: {
  eyebrow: string
  title: string
  subtitle: string
  icon: LucideIcon
  accent?: AdminAccent
  actions?: ReactNode
  backHref?: string
  backLabel?: string
}) {
  const tone = ADMIN_ACCENTS[accent]

  return (
    <div className="space-y-4">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-600 transition-colors hover:text-gray-300"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {backLabel ?? "Voltar"}
        </Link>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${tone.chip} ${tone.glow}`}
          >
            <Icon className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${tone.text}`}>{eyebrow}</p>
            <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-[28px]">{title}</h1>
            <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className={`h-px w-full ${tone.bar} opacity-25 [mask-image:linear-gradient(to_right,black,transparent)]`} />
    </div>
  )
}

/// Fila de números do topo. Sem gráfico e sem card grande: é leitura de relance.
export function AdminMetrics({
  items,
  columns = 4,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string; icon: LucideIcon; accent?: AdminAccent }>
  columns?: 3 | 4 | 5
}) {
  const grid =
    columns === 3
      ? "sm:grid-cols-3"
      : columns === 5
        ? "sm:grid-cols-3 xl:grid-cols-5"
        : "sm:grid-cols-2 xl:grid-cols-4"

  return (
    <div className={`grid gap-2.5 ${grid}`}>
      {items.map((item) => {
        const tone = ADMIN_ACCENTS[item.accent ?? "slate"]
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${tone.chip}`}>
              <item.icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[22px] font-black leading-none tabular-nums text-white">{item.value}</p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                {item.label}
              </p>
              {item.hint && <p className="truncate text-[11px] text-gray-600">{item.hint}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/// Bloco de conteúdo. Título, uma linha explicando e o corpo, sempre nessa
/// ordem, para nenhuma tela virar um amontoado de campos sem nome.
export function SectionCard({
  icon: Icon,
  title,
  description,
  accent = "slate",
  action,
  aside,
  children,
  className = "",
  bodyClassName = "",
  flush = false,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  accent?: AdminAccent
  action?: ReactNode
  aside?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
  /// Corpo sem respiro próprio, para lista que já traz o padding em cada linha.
  flush?: boolean
}) {
  const tone = ADMIN_ACCENTS[accent]

  return (
    <section
      className={`group/section relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] ${className}`}
    >
      <span
        aria-hidden
        className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ${tone.bar} opacity-30 transition-opacity duration-300 group-hover/section:opacity-70 group-focus-within/section:opacity-70`}
      />

      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${tone.chip}`}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[13px] font-black tracking-tight text-white">{title}</h2>
            {description && (
              <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {aside}
        {action && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>

      {children && (
        <div className={`border-t border-white/[0.06] ${flush ? "" : "px-5 py-4"} ${bodyClassName}`}>{children}</div>
      )}
    </section>
  )
}

/// Aviso curto no fluxo da página. Não rouba a cena de um toast nem some
/// sozinho: fica ali enquanto a informação valer.
export function InlineNotice({
  tone = "neutral",
  icon: Icon,
  children,
}: {
  tone?: "neutral" | "info" | "warn" | "danger" | "ok"
  icon?: LucideIcon
  children: ReactNode
}) {
  const tones = {
    neutral: "border-white/[0.07] bg-white/[0.03] text-gray-300",
    info: "border-sky-500/20 bg-sky-500/[0.07] text-sky-200",
    warn: "border-amber-500/20 bg-amber-500/[0.07] text-amber-200",
    danger: "border-red-500/25 bg-red-500/[0.08] text-red-300",
    ok: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-200",
  }

  return (
    <p className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[11.5px] leading-relaxed ${tones[tone]}`}>
      {Icon && <Icon className="mt-px h-3.5 w-3.5 flex-shrink-0" />}
      <span className="min-w-0">{children}</span>
    </p>
  )
}

/// Barra de abas do painel: pílulas com ícone, contador opcional e a cor da
/// área na aba ativa.
export function adminTabListClass() {
  return "h-auto flex-wrap justify-start gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1.5"
}

export function adminTabClass(accent: AdminAccent) {
  return `h-9 flex-none cursor-pointer rounded-xl border border-transparent px-3.5 text-[12px] font-bold text-gray-500 transition-colors hover:text-gray-200 ${ADMIN_ACCENTS[accent].tab}`
}

export function TabCount({ value }: { value: number }) {
  return (
    <span className="ml-0.5 rounded-full bg-white/[0.08] px-1.5 py-px text-[10px] font-black tabular-nums text-gray-400">
      {value}
    </span>
  )
}

/// Atalho para outra área do painel. Usado na visão geral e onde uma tela
/// precisa mandar a pessoa para o lugar certo em vez de repetir o conteúdo.
export function AdminShortcut({
  icon: Icon,
  label,
  description,
  href,
  accent = "slate",
  badge,
}: {
  icon: LucideIcon
  label: string
  description: string
  href: string
  accent?: AdminAccent
  badge?: ReactNode
}) {
  const tone = ADMIN_ACCENTS[accent]

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${tone.chip}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-black text-white">{label}</span>
          {badge}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-gray-500">{description}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-gray-700 transition-colors group-hover:text-gray-300" />
    </Link>
  )
}

export function AdminEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-10 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-gray-700" />
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-gray-500">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
