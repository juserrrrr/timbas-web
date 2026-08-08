"use client"

import { AlertCircle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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

export function PageLoading() {
  return <div className="space-y-5" aria-label="Carregando"><Skeleton className="h-20 w-full bg-white/5" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28 bg-white/5" /><Skeleton className="h-28 bg-white/5" /><Skeleton className="h-28 bg-white/5" /></div><Skeleton className="h-64 w-full bg-white/5" /></div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <Card className="flex flex-col items-center border-red-500/20 bg-red-500/5 p-10 text-center"><AlertCircle className="mb-3 h-9 w-9 text-red-400" /><p className="font-semibold text-white">Não foi possível carregar esta página</p><p className="mt-1 max-w-md text-sm text-gray-400">{message}</p>{retry && <Button className="mt-5" variant="outline" onClick={retry}>Tentar novamente</Button>}</Card>
}

export function ClubPageHeader({ name, subtitle, actions }: { name?: string; subtitle: string; actions?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Shield className="h-6 w-6 text-blue-400" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">EA FC Clubs</p><h1 className="text-2xl font-black text-white">{name ? formatExternalName(name) : "EA FC Clubs"}</h1><p className="text-sm text-gray-500">{subtitle}</p></div></div>{actions}</div>
}
