"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Loader2, ScanLine, ShieldCheck, Trash2, TriangleAlert, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { prepareScoreboardImage, type PreparedImage } from "@/lib/image-upload"
import { TeamCrest } from "./shared"

export interface ReportOutcome {
  autoApproved: boolean
}

export function ReportResultDialog({
  open,
  onOpenChange,
  homeName,
  awayName,
  homeLogo,
  awayLogo,
  requireProof,
  canModerate,
  onSubmit,
  squads,
  onWalkover,
  initialHomeScore,
  initialAwayScore,
  title = "Lançar resultado",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  homeName: string
  awayName: string
  homeLogo?: string | null
  awayLogo?: string | null
  requireProof: boolean
  canModerate: boolean
  onSubmit: (input: {
    homeScore: number
    awayScore: number
    imageBase64?: string
    mimeType?: string
    scorers?: Array<{ playerId: string; goals: number; assists: number }>
  }) => Promise<ReportOutcome>
  /// Quando a partida tem elenco, dá para dizer quem marcou. É o que alimenta a
  /// artilharia no modo real, onde ninguém simula a partida.
  squads?: {
    home: { name: string; players: Array<{ id: string; name: string; position: string }> }
    away: { name: string; players: Array<{ id: string; name: string; position: string }> }
  }
  onWalkover?: (input: { winner: "HOME" | "AWAY"; reason?: string }) => Promise<void>
  initialHomeScore?: number | null
  initialAwayScore?: number | null
  title?: string
}) {
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [walkoverOpen, setWalkoverOpen] = useState(false)
  const [walkoverWinner, setWalkoverWinner] = useState<"HOME" | "AWAY">("HOME")
  const [walkoverReason, setWalkoverReason] = useState("")
  const [scorers, setScorers] = useState<Record<string, { goals: number; assists: number }>>({})
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setHomeScore(initialHomeScore === null || initialHomeScore === undefined ? "" : String(initialHomeScore))
      setAwayScore(initialAwayScore === null || initialAwayScore === undefined ? "" : String(initialAwayScore))
      return
    }
    setHomeScore("")
    setAwayScore("")
    setError("")
    setWalkoverOpen(false)
    setWalkoverWinner("HOME")
    setWalkoverReason("")
    setScorers({})
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
  }, [initialAwayScore, initialHomeScore, open])

  const pickImage = async (file: File | undefined) => {
    if (!file) return
    setError("")
    try {
      const prepared = await prepareScoreboardImage(file)
      setImage((current) => {
        if (current) URL.revokeObjectURL(current.previewUrl)
        return prepared
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ler a imagem.")
    }
  }

  const proofNeeded = requireProof && !canModerate
  const scoresFilled = homeScore !== "" && awayScore !== ""
  const canSubmit = scoresFilled && (!proofNeeded || Boolean(image)) && !busy

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      await onSubmit({
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        imageBase64: image?.base64,
        mimeType: image?.mimeType,
        ...(squads ? {
          scorers: Object.entries(scorers)
            .filter(([, tally]) => tally.goals > 0 || tally.assists > 0)
            .map(([playerId, tally]) => ({ playerId, ...tally })),
        } : {}),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o resultado.")
    } finally {
      setBusy(false)
    }
  }

  const declareWalkover = async () => {
    if (!onWalkover) return
    setBusy(true)
    setError("")
    try {
      await onWalkover({ winner: walkoverWinner, reason: walkoverReason.trim() || undefined })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível declarar o W.O.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#0b0b12]">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription>
            {proofNeeded
              ? "Informe o placar e envie a foto da tela final. A leitura automática confere os números antes de contabilizar."
              : "Informe o placar final. A foto é opcional, mas ajuda a resolver contestações."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamCrest name={homeName} logoUrl={homeLogo} size={40} />
              <span className="line-clamp-2 text-xs font-bold text-white">{homeName}</span>
              <input
                inputMode="numeric"
                value={homeScore}
                onChange={(event) => setHomeScore(event.target.value.replace(/\D/g, "").slice(0, 2))}
                className="h-14 w-full rounded-lg border border-white/10 bg-black/40 text-center text-3xl font-black text-white outline-none focus:border-amber-500/50"
                placeholder="0"
                aria-label={`Gols de ${homeName}`}
              />
            </div>

            <span className="pt-8 text-lg font-black text-gray-600">×</span>

            <div className="flex flex-col items-center gap-2 text-center">
              <TeamCrest name={awayName} logoUrl={awayLogo} size={40} />
              <span className="line-clamp-2 text-xs font-bold text-white">{awayName}</span>
              <input
                inputMode="numeric"
                value={awayScore}
                onChange={(event) => setAwayScore(event.target.value.replace(/\D/g, "").slice(0, 2))}
                className="h-14 w-full rounded-lg border border-white/10 bg-black/40 text-center text-3xl font-black text-white outline-none focus:border-amber-500/50"
                placeholder="0"
                aria-label={`Gols de ${awayName}`}
              />
            </div>
          </div>

          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => void pickImage(event.target.files?.[0])}
            />

            {image ? (
              <div className="relative overflow-hidden rounded-xl border border-white/[0.07]">
                <img src={image.previewUrl} alt="Prova do placar" className="max-h-56 w-full object-contain bg-black/40" />
                <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] bg-white/[0.02] px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <ScanLine className="h-3.5 w-3.5" />
                    {Math.round(image.bytes / 1024)} KB prontos para leitura
                  </span>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(image.previewUrl)
                      setImage(null)
                      if (fileInput.current) fileInput.current.value = ""
                    }}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInput.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center transition hover:border-amber-500/40 hover:bg-amber-500/[0.04]"
              >
                <Camera className="h-7 w-7 text-gray-600" />
                <span className="text-sm font-bold text-white">
                  {proofNeeded ? "Enviar foto do placar" : "Enviar foto do placar (opcional)"}
                </span>
                <span className="text-[11px] text-gray-600">A imagem é reduzida no seu aparelho antes do envio</span>
              </button>
            )}
          </div>

          {squads && (
            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Quem marcou (opcional)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {([squads.home, squads.away] as const).map((squad) => (
                  <div key={squad.name} className="space-y-1">
                    <p className="truncate text-[11px] font-bold text-gray-400">{squad.name}</p>
                    {squad.players.length === 0 && (
                      <p className="text-[10px] text-gray-600">Elenco vazio.</p>
                    )}
                    {squad.players.map((player) => {
                      const tally = scorers[player.id] ?? { goals: 0, assists: 0 }
                      return (
                        <div key={player.id} className="flex items-center gap-1.5 text-[11px]">
                          <span className="w-8 flex-shrink-0 text-gray-600">{player.position}</span>
                          <span className="min-w-0 flex-1 truncate text-gray-300">{player.name}</span>
                          <button
                            onClick={() =>
                              setScorers({ ...scorers, [player.id]: { ...tally, goals: tally.goals + 1 } })
                            }
                            className="cursor-pointer rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-gray-400 hover:text-emerald-300"
                          >
                            gol {tally.goals > 0 ? tally.goals : ""}
                          </button>
                          <button
                            onClick={() =>
                              setScorers({ ...scorers, [player.id]: { ...tally, assists: tally.assists + 1 } })
                            }
                            className="cursor-pointer rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-gray-400 hover:text-blue-300"
                          >
                            ass {tally.assists > 0 ? tally.assists : ""}
                          </button>
                          {(tally.goals > 0 || tally.assists > 0) && (
                            <button
                              onClick={() => {
                                const next = { ...scorers }
                                delete next[player.id]
                                setScorers(next)
                              }}
                              aria-label={`Limpar ${player.name}`}
                              className="cursor-pointer text-gray-700 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <p className="text-[10px] leading-snug text-gray-600">
                Clique para somar. Isso monta a artilharia da liga, então vale a pena preencher.
              </p>
            </div>
          )}

          {canModerate && (
            <p className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2 text-[11px] text-blue-300">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Como você é da organização, o resultado é contabilizado direto, com ou sem foto.
            </p>
          )}

          {onWalkover && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              {walkoverOpen ? (
                <div className="space-y-3">
                  <p className="text-[12px] font-bold text-white">Quem levou a vaga no W.O.?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["HOME", "AWAY"] as const).map((side) => (
                      <button
                        key={side}
                        onClick={() => setWalkoverWinner(side)}
                        className={`cursor-pointer truncate rounded-lg border px-3 py-2 text-xs font-bold transition ${
                          walkoverWinner === side
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                            : "border-white/[0.07] bg-white/[0.02] text-gray-400 hover:text-white"
                        }`}
                      >
                        {side === "HOME" ? homeName : awayName}
                      </button>
                    ))}
                  </div>
                  <input
                    value={walkoverReason}
                    onChange={(event) => setWalkoverReason(event.target.value.slice(0, 240))}
                    placeholder="Motivo, por exemplo: adversário não apareceu"
                    className="h-9 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-[12px] text-white outline-none placeholder:text-gray-600 focus:border-amber-500/50"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setWalkoverOpen(false)} disabled={busy}>
                      Voltar
                    </Button>
                    <Button
                      onClick={() => void declareWalkover()}
                      disabled={busy}
                      className="bg-red-500 text-white hover:bg-red-400"
                    >
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar W.O.
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setWalkoverOpen(true)}
                  className="flex w-full cursor-pointer items-center gap-2 text-left text-[11px] text-gray-500 transition hover:text-white"
                >
                  <UserX className="h-3.5 w-3.5 flex-shrink-0" />
                  Um dos times não jogou? Declarar W.O. e passar a vaga adiante.
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11px] text-red-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={!canSubmit} className="bg-amber-500 text-black hover:bg-amber-400">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar resultado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
