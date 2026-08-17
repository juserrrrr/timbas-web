"use client"

import { useRef, useState } from "react"
import { Camera, Check, Loader2, ScanLine, Trash2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { prepareScoreboardImage, type PreparedImage } from "@/lib/image-upload"
import { extractSquadFromImage, saveCatalogPlayers, type ExtractedPlayer } from "@/lib/services/catalog"

export function SquadImageImport({
  open,
  onOpenChange,
  teamId,
  teamName,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  onImported: (message: string) => void
}) {
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [players, setPlayers] = useState<ExtractedPlayer[]>([])
  const [notes, setNotes] = useState("")
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  const reset = () => {
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
    setPlayers([])
    setNotes("")
    setError("")
    if (fileInput.current) fileInput.current.value = ""
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError("")
    try {
      const prepared = await prepareScoreboardImage(file)
      setImage((current) => {
        if (current) URL.revokeObjectURL(current.previewUrl)
        return prepared
      })
      setPlayers([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ler a imagem.")
    }
  }

  const read = async () => {
    if (!image) return
    setReading(true)
    setError("")
    try {
      const result = await extractSquadFromImage({
        imageBase64: image.base64,
        mimeType: image.mimeType,
        teamName,
      })
      setPlayers(result.players)
      setNotes(result.notes)
      if (result.players.length === 0) {
        setError("Nenhum jogador foi identificado nesta imagem.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ler a imagem.")
    } finally {
      setReading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError("")
    try {
      const result = await saveCatalogPlayers(
        teamId,
        players.map((player) => ({
          name: player.name,
          position: player.position,
          overall: player.overall ?? 70,
          nationality: player.nationality,
        })),
      )
      onOpenChange(false)
      reset()
      onImported(`${result.created} jogadores criados e ${result.updated} atualizados em ${teamName}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar os jogadores.")
    } finally {
      setSaving(false)
    }
  }

  const updatePlayer = (index: number, patch: Partial<ExtractedPlayer>) => {
    setPlayers((current) => current.map((player, at) => (at === index ? { ...player, ...patch } : player)))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0b12]">
        <DialogHeader>
          <DialogTitle className="text-white">Importar elenco por foto</DialogTitle>
          <DialogDescription>
            Mande um print da lista de jogadores de {teamName}. A leitura vem para conferência antes de salvar, nada
            entra no catálogo sem você aprovar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void pick(event.target.files?.[0])}
          />

          {image ? (
            <div className="overflow-hidden rounded-xl border border-white/[0.07]">
              <img src={image.previewUrl} alt="Elenco" className="max-h-48 w-full bg-black/40 object-contain" />
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
              className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 transition hover:border-violet-500/40 hover:bg-violet-500/[0.04]"
            >
              <Camera className="h-7 w-7 text-gray-600" />
              <span className="text-sm font-bold text-white">Escolher imagem do elenco</span>
              <span className="text-[11px] text-gray-600">Print da tela do jogo, tabela de site, o que você tiver</span>
            </button>
          )}

          {image && players.length === 0 && (
            <Button
              onClick={() => void read()}
              disabled={reading}
              className="w-full bg-violet-500 text-white hover:bg-violet-400"
            >
              {reading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ScanLine className="mr-1.5 h-4 w-4" />}
              Ler jogadores da imagem
            </Button>
          )}

          {notes && (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-gray-500">
              {notes}
            </p>
          )}

          {players.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {players.length} jogadores lidos, revise antes de salvar
              </p>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={player.name}
                      onChange={(event) => updatePlayer(index, { name: event.target.value })}
                      className="h-8 flex-1 border-white/10 bg-white/[0.03] text-[12px]"
                    />
                    <Input
                      value={player.position}
                      onChange={(event) => updatePlayer(index, { position: event.target.value.toUpperCase() })}
                      className="h-8 w-16 border-white/10 bg-white/[0.03] text-center text-[12px]"
                    />
                    <Input
                      value={player.overall ?? ""}
                      onChange={(event) =>
                        updatePlayer(index, { overall: Number(event.target.value.replace(/\D/g, "")) || null })
                      }
                      placeholder="70"
                      className="h-8 w-14 border-white/10 bg-white/[0.03] text-center text-[12px]"
                    />
                    <button
                      onClick={() => setPlayers((current) => current.filter((_, at) => at !== index))}
                      aria-label={`Remover ${player.name}`}
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

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving || players.length === 0}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Salvar {players.length} jogadores
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
