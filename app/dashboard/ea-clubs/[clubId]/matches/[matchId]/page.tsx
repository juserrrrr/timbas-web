"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getEaClubMatch } from "@/lib/services/ea-clubs"
import type { EaClubMatchDetail } from "@/lib/services/ea-clubs.types"
import { ClubPageHeader, ErrorState, formatDate, PageLoading, resultStyle } from "@/components/ea-clubs/shared"

function fraction(completed?: number | null, attempted?: number | null) { return completed == null ? "—" : attempted == null ? String(completed) : `${completed}/${attempted}` }

export default function EaClubMatchPage() {
  const { clubId, matchId } = useParams<{ clubId: string; matchId: string }>()
  const [match, setMatch] = useState<EaClubMatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => { setLoading(true); setError(""); try { setMatch(await getEaClubMatch(clubId, matchId)) } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") } finally { setLoading(false) } }, [clubId, matchId])
  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error || !match) return <ErrorState message={error} retry={() => void load()} />
  const result = resultStyle(match.result)
  const homeName = match.isHome ? match.club.name : match.opponentName
  const awayName = match.isHome ? match.opponentName : match.club.name
  const homeScore = match.isHome ? match.goalsFor : match.goalsAgainst
  const awayScore = match.isHome ? match.goalsAgainst : match.goalsFor
  return <div className="space-y-6"><ClubPageHeader name={match.club.nickname || match.club.name} subtitle={formatDate(match.playedAt, true)} />
    <Card className="border-white/[0.07] bg-gradient-to-br from-blue-500/10 via-white/[0.025] to-transparent p-6 text-center"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4"><p className="text-right text-lg font-black text-white sm:text-2xl">{homeName}</p><div><p className="text-3xl font-black tabular-nums text-white sm:text-5xl">{homeScore} <span className="text-gray-600">×</span> {awayScore}</p><Badge variant="outline" className={`mt-3 ${result.classes}`}>{result.label}</Badge></div><p className="text-left text-lg font-black text-white sm:text-2xl">{awayName}</p></div></Card>
    <Card className="overflow-hidden border-white/[0.07] bg-white/[0.025]"><div className="border-b border-white/[0.07] p-4"><h2 className="font-black text-white">Jogadores participantes</h2><p className="text-xs text-gray-500">Somente jogadores presentes nos dados desta partida.</p></div>{match.players.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Jogador</TableHead><TableHead>POS</TableHead><TableHead>Nota</TableHead><TableHead>G</TableHead><TableHead>A</TableHead><TableHead>Chutes</TableHead><TableHead>Passes</TableHead><TableHead>Desarmes</TableHead><TableHead>Defesas</TableHead></TableRow></TableHeader><TableBody>{match.players.map(stat => <TableRow key={stat.player.id}><TableCell className="font-bold text-white"><span className="flex items-center gap-2">{stat.player.playerName}{stat.manOfTheMatch && <span title="Man of the Match"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /></span>}</span></TableCell><TableCell>{stat.position || "—"}</TableCell><TableCell>{stat.rating?.toFixed(1) ?? "—"}</TableCell><TableCell>{stat.goals}</TableCell><TableCell>{stat.assists}</TableCell><TableCell>{stat.shots ?? "—"}</TableCell><TableCell>{fraction(stat.passesCompleted, stat.passesAttempted)}</TableCell><TableCell>{fraction(stat.tacklesCompleted, stat.tacklesAttempted)}</TableCell><TableCell>{stat.saves ?? "—"}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="p-8 text-center text-sm text-gray-500">A EA não informou participantes para esta partida.</p>}</Card>
  </div>
}
