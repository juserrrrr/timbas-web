"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, Check, Loader2, ScanLine, ShieldCheck, TriangleAlert, UserRound, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, StatusPill, TeamCrest, formatDateTime, formatDurationSeconds } from "@/components/competitions/shared"
import { LoadingState } from "@/components/ui/loading-state"
import { correctLabTournamentResult, discardInterruptedLabEaResult, fetchProofImage, listPendingMatchReviews, listPendingProofs, rejectTournamentEaAudit, resolveTournamentMatchReview, reviewProof, type LabEaScoreAuditItem } from "@/lib/services/tournaments"
import type { PendingProof, TournamentMatch } from "@/lib/services/tournaments.types"
import { useSmartPolling } from "@/hooks/use-smart-polling"

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
      <img src={url} alt="Prova do placar" loading="lazy" decoding="async" className="max-h-60 w-full rounded-lg bg-black/40 object-contain" />
    </a>
  )
}

function readableReviewReason(reason: string | null | undefined) {
  const text = reason ?? "Análise solicitada pelos jogadores."
  if (/\d+ min \d+ s/.test(text)) return text
  return text.replace(/(\d+) segundos/, (_, seconds: string) => formatDurationSeconds(Number(seconds)))
}

export function ProofReviewPanel({
  tournamentId,
  scoreAudit,
  onReviewed,
  onNotice,
}: {
  tournamentId: string
  scoreAudit: LabEaScoreAuditItem[]
  onReviewed: () => void
  onNotice: (message: string) => void
}) {
  const [proofs, setProofs] = useState<PendingProof[]>([])
  const [reviews, setReviews] = useState<TournamentMatch[]>([])
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const dataSignature = useRef("")

  const load = useCallback(async (silent = false) => {
    try {
      const [nextProofs, nextReviews] = await Promise.all([listPendingProofs(tournamentId), listPendingMatchReviews(tournamentId)])
      const signature = JSON.stringify([nextProofs, nextReviews])
      if (signature !== dataSignature.current) {
        dataSignature.current = signature
        setProofs(nextProofs)
        setReviews(nextReviews)
        setScores((current) => {
          const next = { ...current }
          for (const match of nextReviews) {
            if (!next[match.id] && match.claimedHomeScore !== null && match.claimedHomeScore !== undefined && match.claimedAwayScore !== null && match.claimedAwayScore !== undefined) {
              next[match.id] = { home: String(match.claimedHomeScore), away: String(match.claimedAwayScore) }
            }
          }
          return next
        })
      }
      setError("")
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Não foi possível carregar as provas pendentes")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useSmartPolling(() => load(dataSignature.current !== ""), { intervalMs: 8_000 })

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

  const rejectAudit = async (matchId: string) => {
    setBusyId(matchId)
    try {
      await rejectTournamentEaAudit(tournamentId, matchId)
      await load()
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível recusar o registro da EA.")
    } finally { setBusyId("") }
  }

  const resolveScoreAudit = async (item: LabEaScoreAuditItem) => {
    setBusyId(item.matchId)
    setError("")
    try {
      if (item.kind === "INTERRUPTED") {
        await discardInterruptedLabEaResult(tournamentId, item.matchId)
        onNotice("Registro interrompido descartado. A partida foi reaberta.")
      } else {
        await correctLabTournamentResult(tournamentId, item.matchId, item.inferredHomeScore, item.inferredAwayScore)
        onNotice(`Resultado corrigido para ${item.inferredHomeScore} × ${item.inferredAwayScore} e classificação recalculada.`)
      }
      await load()
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível corrigir o resultado auditado.")
    } finally {
      setBusyId("")
    }
  }

  if (loading) {
    return <LoadingState className="mx-0 my-0 min-h-[320px]" message="Carregando aprovações" />
  }

  if (proofs.length === 0 && reviews.length === 0 && scoreAudit.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nada esperando aprovação"
        description="Quando alguém enviar um placar que a leitura automática não confirmar, ele aparece aqui para você decidir."
      />
    )
  }


  const humanReviews = reviews.filter((match) => match.reviewSource !== "AUDIT")
  const eaReviews = reviews.filter((match) => match.reviewSource === "AUDIT")
  const reviewCard = (match: TournamentMatch) => {
    const score = scores[match.id] ?? { home: "", away: "" }
    const audit = match.reviewSource === "AUDIT"
    return <Card key={match.id} className={`p-4 ${audit ? "border-cyan-500/25 bg-cyan-500/[0.04]" : "border-amber-500/20 bg-amber-500/[0.035]"}`}><div className="mb-3 flex items-center gap-2">{audit ? <Bot className="h-4 w-4 text-cyan-300" /> : <UserRound className="h-4 w-4 text-amber-300" />}<span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${audit ? "bg-cyan-500/15 text-cyan-200" : "bg-amber-500/15 text-amber-200"}`}>{audit ? "Auditoria EA" : "Solicitação humana"}</span>{audit && match.reviewCanReject === false && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">Após 7 min, resultado obrigatório</span>}</div><div className="flex flex-wrap items-center gap-3"><div className="min-w-52 flex-1"><p className="text-sm font-black text-white">{match.homeTeam?.name} × {match.awayTeam?.name}</p><p className="mt-1 text-xs text-gray-300">{readableReviewReason(match.reviewReason)}</p>{audit && match.eaMatchId && <p className="mt-1 font-mono text-[9px] text-gray-600">EA #{match.eaMatchId}</p>}</div><input aria-label="Placar mandante" value={score.home} onChange={(event) => setScores((old) => ({ ...old, [match.id]: { ...score, home: event.target.value.replace(/\D/g, "").slice(0, 2) } }))} className="h-9 w-14 rounded-lg border border-white/10 bg-black/30 text-center text-sm text-white" /><span className="text-gray-600">×</span><input aria-label="Placar visitante" value={score.away} onChange={(event) => setScores((old) => ({ ...old, [match.id]: { ...score, away: event.target.value.replace(/\D/g, "").slice(0, 2) } }))} className="h-9 w-14 rounded-lg border border-white/10 bg-black/30 text-center text-sm text-white" /><Button disabled={busyId === match.id || score.home === "" || score.away === ""} onClick={() => void resolveRequest(match.id)} className="bg-emerald-500 text-black hover:bg-emerald-400">{audit ? "Aprovar resultado" : "Resolver partida"}</Button>{audit && match.reviewCanReject !== false && <Button disabled={busyId === match.id} variant="outline" onClick={() => void rejectAudit(match.id)} className="border-red-500/25 text-red-300 hover:bg-red-500/10"><X className="mr-1.5 h-4 w-4" />Recusar registro</Button>}</div></Card>
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}

      {humanReviews.length > 0 && <div className="flex items-center gap-2 pt-1"><UserRound className="h-4 w-4 text-amber-300" /><h3 className="text-xs font-black uppercase tracking-wider text-amber-200">Solicitações humanas</h3></div>}
      {humanReviews.map(reviewCard)}

      {eaReviews.length > 0 && <div className="flex items-center gap-2 pt-3"><Bot className="h-4 w-4 text-cyan-300" /><h3 className="text-xs font-black uppercase tracking-wider text-cyan-200">Auditoria EA</h3></div>}
      {eaReviews.map(reviewCard)}

      {proofs.length > 0 && <div className="flex items-center gap-2 pt-3"><ScanLine className="h-4 w-4 text-violet-300" /><h3 className="text-xs font-black uppercase tracking-wider text-violet-200">Provas enviadas por pessoas</h3></div>}
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

      {scoreAudit.length > 0 && (
        <div className="space-y-3 pt-3">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
            <div><h3 className="text-xs font-black uppercase tracking-wider text-red-200">Auditoria de resultados encerrados</h3><p className="mt-1 text-[11px] text-gray-500">Registros inconsistentes encontrados pela auditoria da EA no Laboratório.</p></div>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {scoreAudit.map((item) => (
              <Card key={item.matchId} className="border-red-500/25 bg-red-500/[0.04] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.label ?? "Fase de grupos"}</p>
                <p className="mt-1 text-xs font-bold text-white">{item.homeTeamName} × {item.awayTeamName}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px]"><span className="text-red-300">EA: <b>{item.officialHomeScore} × {item.officialAwayScore}</b></span>{item.kind === "SCORE_MISMATCH" ? <span className="text-emerald-300">SCORE: <b>{item.inferredHomeScore} × {item.inferredAwayScore}</b></span> : <span className="text-amber-300">Interrompida em {formatDurationSeconds(item.durationSeconds)}</span>}</div>
                <p className="mt-1 text-[9px] leading-relaxed text-gray-500">{item.reason}</p>
                <p className="mt-1 font-mono text-[9px] text-gray-600">EA #{item.eaMatchId ?? "sem ID"}</p>
                <Button size="sm" disabled={busyId !== ""} onClick={() => void resolveScoreAudit(item)} className="mt-3 w-full bg-emerald-500 text-[10px] font-bold text-black hover:bg-emerald-400">
                  {busyId === item.matchId ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}{item.kind === "INTERRUPTED" ? "Descartar e reabrir" : `Aplicar ${item.inferredHomeScore} × ${item.inferredAwayScore}`}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
