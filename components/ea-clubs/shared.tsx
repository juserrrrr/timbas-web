"use client"

import Link from "next/link"
import { AlertCircle, CalendarDays, Shield } from "lucide-react"
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
  const homeName = match.isHome ? clubName : match.opponentName
  const awayName = match.isHome ? match.opponentName : clubName
  const homeScore = match.isHome ? match.goalsFor : match.goalsAgainst
  const awayScore = match.isHome ? match.goalsAgainst : match.goalsFor
  return <Link href={`/dashboard/ea-clubs/${clubId}/matches/${match.id}`} className="group grid gap-3 rounded-xl border border-white/[0.07] bg-black/30 p-4 transition hover:border-white/15 hover:bg-white/[0.04] sm:grid-cols-[1fr_auto_auto] sm:items-center">
    <div className="min-w-0"><p className="truncate font-bold text-white">{homeName} <span className="mx-1 text-gray-500">x</span> {awayName}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(match.playedAt, true)}</p></div>
    <p className="text-xl font-black tabular-nums text-white">{homeScore} <span className="text-gray-600">×</span> {awayScore}</p>
    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${result.classes}`}>{result.label}</span>
  </Link>
}

export function ClubPageHeader({ name, subtitle, actions }: { name?: string; subtitle: string; actions?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Shield className="h-6 w-6 text-blue-400" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">EA FC Clubs</p><h1 className="text-2xl font-black text-white">{name || "EA FC Clubs"}</h1><p className="text-sm text-gray-500">{subtitle}</p></div></div>{actions}</div>
}
