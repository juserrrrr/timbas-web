"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ClubPageHeader, ErrorState, formatDate, PageLoading } from "@/components/ea-clubs/shared"
import { Card } from "@/components/ui/card"
import { getEaClub, getEaClubPlayer } from "@/lib/services/ea-clubs"
import type { EaClub, EaClubPlayerProfile } from "@/lib/services/ea-clubs.types"

function display(value?: number | null, decimals = 0) {
  return value == null ? "—" : value.toFixed(decimals)
}

export default function EaClubPlayerPage() {
  const { clubId, playerId } = useParams<{ clubId: string; playerId: string }>()
  const [club, setClub] = useState<EaClub | null>(null)
  const [player, setPlayer] = useState<EaClubPlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [clubData, playerData] = await Promise.all([
        getEaClub(clubId),
        getEaClubPlayer(clubId, playerId),
      ])
      setClub(clubData)
      setPlayer(playerData)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }, [clubId, playerId])

  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error || !player) return <ErrorState message={error} retry={() => void load()} />

  const totals = player.eaClubGames == null ? [] : [
    { label: "Partidas", value: player.eaClubGames },
    { label: "Gols", value: player.eaClubGoals },
    { label: "Assistências", value: player.eaClubAssists },
    { label: "MVPs", value: player.eaClubMvps },
    { label: "Média", value: display(player.eaClubRating, 1) },
    { label: "Passes certos", value: player.eaClubPassesMade },
    { label: "Precisão de passe", value: player.eaClubPassSuccessRate == null ? "—" : `${display(player.eaClubPassSuccessRate, 1)}%` },
    { label: "Desarmes certos", value: player.eaClubTacklesMade },
    { label: "Precisão de desarme", value: player.eaClubTackleSuccessRate == null ? "—" : `${display(player.eaClubTackleSuccessRate, 1)}%` },
    { label: "Aproveitamento de chute", value: player.eaClubShotSuccessRate == null ? "—" : `${display(player.eaClubShotSuccessRate, 1)}%` },
    { label: "Clean sheets DEF", value: player.eaClubCleanSheetsDef },
    { label: "Clean sheets GK", value: player.eaClubCleanSheetsGk },
    { label: "Cartões vermelhos", value: player.eaClubRedCards },
  ]

  return <div className="mx-auto max-w-7xl space-y-6">
    <ClubPageHeader name={player.playerName} subtitle={`Estatísticas no ${club?.nickname || club?.name || "clube"}`} />
    {totals.length > 0 ? <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Total no clube</p><h2 className="text-xl font-black text-white">Desempenho pelo clube</h2></div>
        <p className="text-xs text-gray-500">Atualizado em {formatDate(player.eaClubStatsUpdatedAt, true)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
        {totals.map((item) => <Card key={item.label} className="border-emerald-500/10 bg-emerald-500/[0.035] p-5 text-center"><p className="text-2xl font-black text-white">{item.value ?? "—"}</p><p className="mt-1 text-xs text-gray-500">{item.label}</p></Card>)}
      </div>
    </section> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-bold text-white">Estatísticas ainda indisponíveis</p><p className="mt-1 text-sm text-gray-500">Os totais deste jogador serão preenchidos na próxima sincronização com a EA.</p></Card>}
  </div>
}
