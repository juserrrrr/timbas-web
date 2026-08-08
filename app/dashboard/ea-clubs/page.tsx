"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Gamepad2, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getEaClubs } from "@/lib/services/ea-clubs"
import type { EaClub } from "@/lib/services/ea-clubs.types"
import { ErrorState, PageLoading } from "@/components/ea-clubs/shared"

export default function EaClubsPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<EaClub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setClubs(await getEaClubs())
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os clubes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} retry={() => void load()} />

  return <div className="dashboard-view space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Futebol virtual</p><h1 className="text-3xl font-black text-white">EA FC Clubs</h1><p className="text-sm text-gray-500">Escolha um clube para acompanhar partidas, jogadores e rankings.</p></div>
    {clubs.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clubs.map(club => <button key={club.id} onClick={() => router.push(`/dashboard/ea-clubs/${club.id}`)} className="text-left"><Card className="h-full border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-blue-500/30 hover:bg-blue-500/5"><div className="flex items-start gap-4"><div className="rounded-xl bg-blue-500/10 p-3"><Shield className="h-6 w-6 text-blue-400" /></div><div className="min-w-0"><h2 className="truncate text-lg font-black text-white">{club.nickname || club.name}</h2>{club.nickname && <p className="truncate text-sm text-gray-400">{club.name}</p>}<p className="mt-2 text-xs text-gray-500">Club ID: {club.externalClubId}</p><p className="mt-3 text-xs font-bold uppercase tracking-wider text-blue-400">Abrir clube →</p></div></div></Card></button>)}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-12 text-center"><Gamepad2 className="mx-auto mb-4 h-10 w-10 text-gray-600" /><p className="font-bold text-white">Nenhum clube disponível</p><p className="mt-1 text-sm text-gray-500">Um administrador precisa conectar o clube pelo painel administrativo.</p></Card>}
  </div>
}
