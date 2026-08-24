"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, ScanLine, ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, StatusPill, TeamCrest, formatDateTime } from "@/components/competitions/shared"
import { fetchProofImage, listPendingMatchReviews, listPendingProofs, resolveTournamentMatchReview, reviewProof } from "@/lib/services/tournaments"
import type { PendingProof, TournamentMatch } from "@/lib/services/tournaments.types"

function ProofImage({ tournamentId, proofId }: { tournamentId: string; proofId: string }) {
  const [url, setUrl] = useState("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl = ""
    fetchProofImage(tournamentId, proofId)
      .then((value) => {
        objectUrl = value
        setUrl(value)
      })
      .catch(() => setFailed(true))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [tournamentId, proofId])

  if (failed) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-black/40 text-[11px] text-gray-600">
        Não foi possível carregar a imagem
      </div>
    )
  }
  if (!url) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-black/40">
        <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
      </div>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt="Prova do placar" className="max-h-60 w-full rounded-lg bg-black/40 object-contain" />
    </a>
  )
}

export function ProofReviewPanel({ tournamentId, onReviewed }: { tournamentId: string; onReviewed: () => void }) {
  const [proofs, setProofs] = useState<PendingProof[]>([])
  const [reviews, setReviews] = useState<TournamentMatch[]>([])
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextProofs, nextReviews] = await Promise.all([listPendingProofs(tournamentId), listPendingMatchReviews(tournamentId)])
      setProofs(nextProofs)
      setReviews(nextReviews)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as provas pendentes")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    void load()
  }, [load])

  const review = async (proofId: string, approve: boolean) => {
    setBusyId(proofId)
    setError("")
    try {
      await reviewProof(tournamentId, proofId, approve)
      await load()
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível avaliar a prova.")
    } finally {
      setBusyId("")
    }
  }

  const resolveRequest = async (matchId: string) => {
    const score = scores[matchId]
    if (!score || score.home === "" || score.away === "") return
    setBusyId(matchId)
    try {
      await resolveTournamentMatchReview(tournamentId, matchId, Number(score.home), Number(score.away))
      await load()
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível resolver a análise.")
    } finally { setBusyId("") }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    )
  }

  if (proofs.length === 0 && reviews.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nada esperando aprovação"
        description="Quando alguém enviar um placar que a leitura automática não confirmar, ele aparece aqui para você decidir."
      />
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}

      {reviews.map((match) => {
        const score = scores[match.id] ?? { home: "", away: "" }
        return <Card key={match.id} className="border-red-500/20 bg-red-500/[0.035] p-4"><div className="flex flex-wrap items-center gap-3"><div className="min-w-52 flex-1"><p className="text-sm font-black text-white">{match.homeTeam?.name} × {match.awayTeam?.name}</p><p className="mt-1 text-xs text-red-200">{match.reviewReason ?? "Análise solicitada pelos jogadores."}</p></div><input aria-label="Placar mandante" value={score.home} onChange={(event) => setScores((old) => ({ ...old, [match.id]: { ...score, home: event.target.value.replace(/\D/g, "").slice(0, 2) } }))} className="h-9 w-14 rounded-lg border border-white/10 bg-black/30 text-center text-sm text-white" /><span className="text-gray-600">×</span><input aria-label="Placar visitante" value={score.away} onChange={(event) => setScores((old) => ({ ...old, [match.id]: { ...score, away: event.target.value.replace(/\D/g, "").slice(0, 2) } }))} className="h-9 w-14 rounded-lg border border-white/10 bg-black/30 text-center text-sm text-white" /><Button disabled={busyId === match.id || score.home === "" || score.away === ""} onClick={() => void resolveRequest(match.id)} className="bg-emerald-500 text-black hover:bg-emerald-400">Resolver partida</Button></div></Card>
      })}

      {proofs.map((proof) => {
        const aiRead = proof.aiConfidence !== null && proof.aiHomeScore !== null

        return (
          <Card key={proof.id} className="border-white/[0.07] bg-white/[0.025] p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    {proof.match.label ?? `Rodada ${proof.match.round}`}
                  </p>
                  <span className="text-[11px] text-gray-600">{formatDateTime(proof.createdAt)}</span>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <TeamCrest name={proof.match.homeTeam?.name} logoUrl={proof.match.homeTeam?.logoUrl} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                    {proof.match.homeTeam?.name ?? "?"}
                  </span>
                  <span className="text-xl font-black tabular-nums text-white">
                    {proof.claimedHomeScore} <span className="text-gray-600">×</span> {proof.claimedAwayScore}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-white">
                    {proof.match.awayTeam?.name ?? "?"}
                  </span>
                  <TeamCrest name={proof.match.awayTeam?.name} logoUrl={proof.match.awayTeam?.logoUrl} size={28} />
                </div>

                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <ScanLine className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                      Leitura automática
                    </span>
                    {aiRead && (
                      <StatusPill tone={proof.aiAgrees ? "live" : "warn"}>
                        {proof.aiAgrees ? "Bateu" : "Divergente"} · {proof.aiConfidence}%
                      </StatusPill>
                    )}
                  </div>
                  {aiRead ? (
                    <p className="text-[12px] text-gray-400">
                      Leu <span className="font-black text-white">{proof.aiHomeScore} × {proof.aiAwayScore}</span>
                      {proof.aiModel && <span className="text-gray-600"> · {proof.aiModel}</span>}
                    </p>
                  ) : (
                    <p className="text-[12px] text-gray-500">Sem leitura automática para esta prova.</p>
                  )}
                  {proof.aiNotes && <p className="mt-1 text-[11px] leading-snug text-gray-600">{proof.aiNotes}</p>}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => void review(proof.id, true)}
                    disabled={busyId === proof.id}
                    className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400"
                  >
                    {busyId === proof.id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    Aprovar placar
                  </Button>
                  <Button
                    onClick={() => void review(proof.id, false)}
                    disabled={busyId === proof.id}
                    variant="outline"
                    className="border-red-500/25 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Recusar
                  </Button>
                </div>
              </div>

              <ProofImage tournamentId={tournamentId} proofId={proof.id} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
