"use client"

import type { ReactNode } from "react"
import { AlertCircle, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RouteLoadingSignal } from "@/lib/navigation-context"
import { BRASILIA_TIME_ZONE } from "@/lib/date-time"

export function formatDateTime(value?: string | null) {
  if (!value) return "A definir"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return `${date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: BRASILIA_TIME_ZONE })} BRT`
}

export function formatDurationSeconds(seconds: number) {
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s (${seconds} segundos)`
}

export function CompetitionHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  accent = "text-amber-400",
  accentBg = "bg-amber-500/10 border-amber-500/20",
  actions,
}: {
  eyebrow: string
  title: string
  subtitle: string
  icon: LucideIcon
  accent?: string
  accentBg?: string
  actions?: ReactNode
}) {
  return (
    <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.018] p-5 sm:flex-row sm:items-center sm:p-6">
      <span aria-hidden className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-blue-400/0 via-white/30 to-red-400/0" />
      <div className="relative flex items-center gap-3">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border ${accentBg}`}>
          <Icon className={`h-6 w-6 ${accent}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${accent}`}>{eyebrow}</p>
          <h1 className="truncate text-2xl font-black text-white sm:text-3xl">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="relative flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = "text-white",
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: LucideIcon
  accent?: string
}) {
  return (
    <Card className="border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
        {Icon && <Icon className={`h-4 w-4 ${accent}`} />}
      </div>
      <p className={`mt-1 text-2xl font-black tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-600">{hint}</p>}
    </Card>
  )
}

export function EmptyState({
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
    <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center sm:p-12">
      <Icon className="mx-auto mb-4 h-10 w-10 text-gray-600" />
      <p className="font-bold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Card className="flex flex-col items-center border-red-500/20 bg-red-500/5 p-10 text-center">
      <AlertCircle className="mb-3 h-9 w-9 text-red-400" />
      <p className="font-semibold text-white">Algo deu errado</p>
      <p className="mt-1 max-w-md text-sm text-gray-400">{message}</p>
      {retry && (
        <Button className="mt-5" variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </Card>
  )
}

export function PageLoading() {
  return <RouteLoadingSignal />
}

const STATUS_TONES: Record<string, string> = {
  neutral: "border-white/10 bg-white/[0.04] text-gray-300",
  live: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  warn: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  done: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  danger: "border-red-500/25 bg-red-500/10 text-red-400",
}

export function StatusPill({ tone = "neutral", children, className = "" }: { tone?: keyof typeof STATUS_TONES; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function TeamCrest({
  name,
  logoUrl,
  size = 32,
}: {
  name: string | null | undefined
  logoUrl?: string | null
  size?: number
}) {
  const initials = (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? "Time"}
        width={size}
        height={size}
        className="flex-shrink-0 rounded-lg object-cover ring-1 ring-white/10"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-black text-gray-400 ring-1 ring-white/10"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  )
}
