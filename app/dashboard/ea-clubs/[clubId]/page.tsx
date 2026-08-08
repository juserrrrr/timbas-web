"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, CirclePercent, RefreshCw, ShieldCheck, ShieldX, Swords, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getEaClubDashboard, syncEaClub } from "@/lib/services/ea-clubs"
import type { EaClubDashboard } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, formatDate, MatchRow, PageLoading } from "@/components/ea-clubs/shared"

export default function EaClubDashboardPage({ params }: { params: Promise<{ clubId: string }> }) {
  const [clubId, setClubId] = useState("")
  const [data, setData] = useState<EaClubDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null)
  useEffect(() => { void params.then(value => setClubId(value.clubId)) }, [params])
  const load = useCallback(async () => { if (!clubId) return; setLoading(true); setError(""); try { setData(await getEaClubDashboard(clubId)) } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") } finally { setLoading(false) } }, [clubId])
  useEffect(() => { void load() }, [load])
  async function sync() { setSyncing(true); setNotice(null); try { const result = await syncEaClub(clubId); setNotice({ kind: "success", message: result.imported ? `${result.imported} novas partidas importadas.` : "Nenhuma partida nova encontrada." }); await load() } catch (err) { setNotice({ kind: "error", message: err instanceof Error ? err.message : "Falha ao sincronizar" }) } finally { setSyncing(false) } }
  if (loading || !clubId) return <PageLoading />
  if (error || !data) return <ErrorState message={error} retry={() => void load()} />
  const stats = [{ label: "Partidas", value: data.matches, icon: Swords }, { label: "Vitórias", value: data.wins, icon: Trophy }, { label: "Empates", value: data.draws, icon: ShieldCheck }, { label: "Derrotas", value: data.losses, icon: ShieldX }, { label: "Aproveitamento", value: `${Math.round(data.winRate <= 1 ? data.winRate * 100 : data.winRate)}%`, icon: CirclePercent }, { label: "Gols marcados", value: data.goalsFor, icon: Activity }, { label: "Gols sofridos", value: data.goalsAgainst, icon: Activity }]
  return <div className="space-y-6"><ClubPageHeader name={data.club.nickname || data.club.name} subtitle={`Última sincronização: ${formatDate(data.club.lastSyncAt, true)}`} actions={<Button onClick={() => void sync()} disabled={syncing}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Buscando partidas do EA FC..." : "Sincronizar partidas"}</Button>} />
    {notice && <p role="status" className={`rounded-lg border px-4 py-3 text-sm font-medium ${notice.kind === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>{notice.message}</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <Card key={label} className="border-white/[0.07] bg-white/[0.025] p-4"><Icon className="mb-3 h-4 w-4 text-blue-400" /><p className="text-2xl font-black tabular-nums text-white">{value}</p><p className="text-xs font-medium text-gray-500">{label}</p></Card>)}</div>
    <section><h2 className="mb-3 text-lg font-black text-white">Últimas partidas</h2>{data.recentMatches.length ? <div className="space-y-2">{data.recentMatches.map(match => <MatchRow key={match.id} clubId={clubId} clubName={data.club.name} match={match} />)}</div> : <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-bold text-white">Nenhuma partida foi sincronizada ainda.</p><p className="mt-1 text-sm text-gray-500">Use o botão acima para importar as partidas recentes.</p><Button className="mt-5" onClick={() => void sync()} disabled={syncing}>Sincronizar partidas</Button></Card>}</section>
  </div>
}
