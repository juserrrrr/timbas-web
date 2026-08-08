"use client"

import Link from "next/link"
import { AlertCircle, CalendarDays, ChevronRight, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { EaClubMatch, EaMatchResult } from "@/lib/services/ea-clubs.types"

export function formatDate(value?: string | null, withTime = false) {
  if (!value) return "Nunca"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("pt-BR", withTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" })
}

export function formatExternalName(value: string) {
  if (!/[ÃÂ][\u0080-\u00bf]|â[\u0080-\u00bf]/.test(value)) return value
  const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0))
  const repaired = new TextDecoder("utf-8").decode(bytes)
  return repaired.includes("�") ? value : repaired
}

export function resultStyle(result: EaMatchResult) {
  if (result === "WIN") return { label: "Vitória", classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" }
  if (result === "DRAW") return { label: "Empate", classes: "border-amber-500/30 bg-amber-500/10 text-amber-400" }
  return { label: "Derrota", classes: "border-red-500/30 bg-red-500/10 text-red-400" }
}

export function PageLoading() {
  return <div className="space-y-5" aria-label="Carregando"><Skeleton className="h-20 w-full bg-white/5" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28 bg-white/5" /><Skeleton className="h-28 bg-white/5" /><Skeleton className="h-28 bg-white/5" /></div><Skeleton className="h-64 w-full bg-white/5" /></div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <Card className="flex flex-col items-center border-red-500/20 bg-red-500/5 p-10 text-center"><AlertCircle className="mb-3 h-9 w-9 text-red-400" /><p className="font-semibold text-white">Não foi possível carregar esta página</p><p className="mt-1 max-w-md text-sm text-gray-400">{message}</p>{retry && <Button className="mt-5" variant="outline" onClick={retry}>Tentar novamente</Button>}</Card>
}

export function MatchRow({ clubId, clubName, match }: { clubId: string; clubName: string; match: EaClubMatch }) {
  const result = resultStyle(match.result)
  const homeName = formatExternalName(match.isHome ? clubName : match.opponentName)
  const awayName = formatExternalName(match.isHome ? match.opponentName : clubName)
  const homeScore = match.isHome ? match.goalsFor : match.goalsAgainst
  const awayScore = match.isHome ? match.goalsAgainst : match.goalsFor
  const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
  return <Link href={`/dashboard/ea-clubs/${clubId}/matches/${match.id}`} className="group relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-black/25 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-400/25 hover:bg-white/[0.035] hover:shadow-lg hover:shadow-blue-950/10 sm:p-5">
    <div className={`absolute inset-y-0 left-0 w-1 ${match.result === "WIN" ? "bg-emerald-500" : match.result === "DRAW" ? "bg-amber-500" : "bg-red-500"}`} />
    <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
      <p className="flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(match.playedAt, true)}</p>
      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${result.classes}`}>{result.label}</span>
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-8">
      <div className="flex min-w-0 flex-col items-center gap-2 sm:flex-row sm:justify-end sm:text-right">
        <p className="order-2 max-w-full truncate text-center text-sm font-bold text-white sm:order-1 sm:text-base">{homeName}</p>
        <div className="order-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-gray-300 sm:order-2 sm:h-12 sm:w-12">{initials(homeName)}</div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xl font-black tabular-nums text-white sm:px-5 sm:text-2xl">
        <span>{homeScore}</span><span className="text-xs font-medium text-gray-600">×</span><span>{awayScore}</span>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-2 sm:flex-row">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-gray-300 sm:h-12 sm:w-12">{initials(awayName)}</div>
        <p className="max-w-full truncate text-center text-sm font-bold text-white sm:text-left sm:text-base">{awayName}</p>
      </div>
    </div>
    <ChevronRight className="absolute bottom-2 right-2 h-4 w-4 text-gray-700 transition group-hover:translate-x-0.5 group-hover:text-blue-400" />
  </Link>
}

export function ClubPageHeader({ name, subtitle, actions }: { name?: string; subtitle: string; actions?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Shield className="h-6 w-6 text-blue-400" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">EA FC Clubs</p><h1 className="text-2xl font-black text-white">{name ? formatExternalName(name) : "EA FC Clubs"}</h1><p className="text-sm text-gray-500">{subtitle}</p></div></div>{actions}</div>
}
