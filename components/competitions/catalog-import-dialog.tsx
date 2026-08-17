"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Check, ClipboardPaste, Loader2, Sparkles, Trash2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { prepareScoreboardImage, type PreparedImage } from "@/lib/image-upload"
import {
  createCatalogTeams,
  extractSquadFromImage,
  extractTeamsWithAi,
  parsePastedPlayers,
  parsePastedTeams,
  parseSquadWithAi,
  saveCatalogPlayers,
  type ExtractedPlayer,
  type ExtractedTeam,
} from "@/lib/services/catalog"

type Mode = "paste" | "image"

interface Row {
  name: string
  position: string
  overall: number | null
}

const PLAYER_PLACEHOLDER = `Cole a lista aqui. Funciona com:

Neymar;ATA;89
10. Zico     MEI     91
Alisson`

const TEAM_PLACEHOLDER = `Cole a lista aqui. Funciona com:

Flamengo;FLA
Palmeiras;PAL
1. Botafogo`

export function CatalogImportDialog({
  open,
  onOpenChange,
  target,
  competitionId,
  teamId,
  teamName,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: "teams" | "players"
  competitionId?: string
  teamId?: string
  teamName?: string
  onImported: (message: string) => void
}) {
  const isTeams = target === "teams"
  const [mode, setMode] = useState<Mode>("paste")
  const [text, setText] = useState("")
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  const reset = () => {
    setText("")
    setRows([])
    setNotes("")
    setError("")
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
    if (fileInput.current) fileInput.current.value = ""
  }

  useEffect(() => {
    if (!open) reset()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPaste = async (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile()
      if (!file) return
      event.preventDefault()
      setMode("image")
      await loadImage(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [open])

  const loadImage = async (file: File | undefined) => {
    if (!file) return
    setError("")
    try {
      const prepared = await prepareScoreboardImage(file)
      setImage((current) => {
        if (current) URL.revokeObjectURL(current.previewUrl)
        return prepared
      })
      setRows([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ler a imagem.")
    }
  }

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError("")
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.")
    } finally {
      setBusy("")
    }
  }

  const readPasted = () =>
    run("paste", async () => {
      if (isTeams) {
        const result = await parsePastedTeams(text)
        setRows(result.teams.map((team) => ({ name: team.name, position: team.shortName ?? "", overall: null })))
        if (result.teams.length === 0) setError("Nenhum time reconhecido nesse texto. Tente organizar com IA.")
      } else {
        const result = await parsePastedPlayers(text)
        setRows(result.players.map(toRow))
        if (result.players.length === 0) setError("Nenhum jogador reconhecido nesse texto. Tente organizar com IA.")
      }
    })

  const readWithAi = () =>
    run("ai", async () => {
      if (isTeams) {
        const result = await extractTeamsWithAi(
          mode === "image" && image
            ? { imageBase64: image.base64, mimeType: image.mimeType }
            : { text },
        )
        setRows(result.teams.map((team) => ({ name: team.name, position: team.shortName ?? "", overall: null })))
        setNotes(result.notes)
        if (result.teams.length === 0) setError("Nenhum time foi identificado.")
      } else {
        const result =
          mode === "image" && image
            ? await extractSquadFromImage({ imageBase64: image.base64, mimeType: image.mimeType, teamName })
            : await parseSquadWithAi(text, teamName)
        setRows(result.players.map(toRow))
        setNotes(result.notes)
        if (result.players.length === 0) setError("Nenhum jogador foi identificado.")
      }
    })

  const save = () =>
    run("save", async () => {
      if (isTeams) {
        const result = await createCatalogTeams(
          competitionId!,
          rows.map((row) => ({ name: row.name, shortName: row.position || null })),
        )
        onOpenChange(false)
        onImported(`${result.created} times adicionados, ${result.total} no total.`)
      } else {
        const result = await saveCatalogPlayers(
          teamId!,
          rows.map((row) => ({ name: row.name, position: row.position || "MEI", overall: row.overall ?? 70 })),
        )
        onOpenChange(false)
        onImported(`${result.created} jogadores criados e ${result.updated} atualizados em ${teamName}.`)
      }
    })

  const canReadAi = mode === "image" ? Boolean(image) : text.trim().length > 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0b12]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isTeams ? "Adicionar times" : `Elenco de ${teamName}`}
          </DialogTitle>
          <DialogDescription>
            Cole a lista ou mande um print. O resultado vem para conferência, nada é salvo sem você aprovar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "paste" as const, label: "Colar texto", icon: ClipboardPaste },
                { id: "image" as const, label: "Imagem", icon: Camera },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setMode(option.id)
                  setRows([])
                  setError("")
                }}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition ${
                  mode === option.id
                    ? "border-sky-500/40 bg-sky-500/[0.08] text-sky-300"
                    : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                }`}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>

          {mode === "paste" ? (
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={isTeams ? TEAM_PLACEHOLDER : PLAYER_PLACEHOLDER}
                rows={8}
                className="border-white/10 bg-black/30 font-mono text-[12px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void readPasted()}
                  disabled={busy !== "" || text.trim().length < 2}
                  className="bg-sky-500 text-black hover:bg-sky-400"
                >
                  {busy === "paste" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardPaste className="mr-1.5 h-4 w-4" />
                  )}
                  Ler lista
                </Button>
                <Button onClick={() => void readWithAi()} disabled={busy !== "" || !canReadAi} variant="outline">
                  {busy === "ai" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-4 w-4" />
                  )}
                  Organizar com IA
                </Button>
              </div>
              <p className="text-[11px] text-gray-600">
                Ler lista funciona offline, sem IA. Use organizar com IA quando o texto vier bagunçado.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void loadImage(event.target.files?.[0])}
              />

              {image ? (
                <div className="overflow-hidden rounded-xl border border-white/[0.07]">
                  <img src={image.previewUrl} alt="Lista" className="max-h-52 w-full bg-black/40 object-contain" />
                  <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] bg-white/[0.02] px-3 py-2">
                    <span className="text-[11px] text-gray-500">{Math.round(image.bytes / 1024)} KB prontos</span>
                    <button
                      onClick={reset}
                      className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Trocar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInput.current?.click()}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 transition hover:border-sky-500/40 hover:bg-sky-500/[0.04]"
                >
                  <Camera className="h-7 w-7 text-gray-600" />
                  <span className="text-sm font-bold text-white">Escolher imagem</span>
                  <span className="text-[11px] text-gray-600">Ou dê Ctrl+V para colar um print direto aqui</span>
                </button>
              )}

              <Button
                onClick={() => void readWithAi()}
                disabled={busy !== "" || !image}
                className="w-full bg-violet-500 text-white hover:bg-violet-400"
              >
                {busy === "ai" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Ler imagem com IA
              </Button>
            </div>
          )}

          {notes && (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-gray-500">
              {notes}
            </p>
          )}

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {rows.length} {isTeams ? "times lidos" : "jogadores lidos"}, revise antes de salvar
              </p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={row.name}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, at) => (at === index ? { ...item, name: event.target.value } : item)),
                        )
                      }
                      className="h-8 flex-1 border-white/10 bg-white/[0.03] text-[12px]"
                    />
                    <Input
                      value={row.position}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, at) =>
                            at === index ? { ...item, position: event.target.value.toUpperCase() } : item,
                          ),
                        )
                      }
                      placeholder={isTeams ? "SIGLA" : "POS"}
                      className="h-8 w-20 border-white/10 bg-white/[0.03] text-center text-[12px]"
                    />
                    {!isTeams && (
                      <Input
                        value={row.overall ?? ""}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item, at) =>
                              at === index
                                ? { ...item, overall: Number(event.target.value.replace(/\D/g, "")) || null }
                                : item,
                            ),
                          )
                        }
                        placeholder="70"
                        className="h-8 w-14 border-white/10 bg-white/[0.03] text-center text-[12px]"
                      />
                    )}
                    <button
                      onClick={() => setRows((current) => current.filter((_, at) => at !== index))}
                      aria-label={`Remover ${row.name}`}
                      className="cursor-pointer rounded p-1.5 text-gray-600 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11px] text-red-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy !== ""}>
              Cancelar
            </Button>
            <Button
              onClick={() => void save()}
              disabled={busy !== "" || rows.length === 0}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {busy === "save" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Salvar {rows.length}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function toRow(player: ExtractedPlayer): Row {
  return { name: player.name, position: player.position, overall: player.overall }
}
