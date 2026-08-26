"use client"

import { useEffect, useRef, useState } from "react"
import { Download, RotateCcw, Save } from "lucide-react"
import "@fontsource/anton"
import "@fontsource/tourney/600.css"
import "@fontsource/cinzel-decorative/700.css"
import "@fontsource/black-ops-one"
import "@fontsource/graduate"
import "@fontsource/teko/600.css"
import { Button } from "@/components/ui/button"
import { AWARD_FONT_OPTIONS } from "@/lib/award-card-config"
import { DEFAULT_CHAMPION_CARD_LAYOUT, type ChampionCardLayout } from "@/lib/champion-card-config"
import { renderChampionCard, type ChampionCardData } from "@/lib/champion-card-render"
import { publicTournamentUrl } from "@/lib/public-site-url"
import { getAdminAwardCardSettings, saveAdminAwardCardSettings } from "@/lib/services/award-cards"

const SAMPLE_PLAYERS = ["Indio", "Matheus", "Gabriel", "Rafael", "Lucas", "Bruno", "Diego", "Felipe", "Gustavo", "Henrique", "João", "Pedro", "Caio", "Vinícius"]
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function RangeControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="grid grid-cols-[92px_1fr_54px] items-center gap-2 text-[10px] font-bold text-gray-500"><span>{label}</span><input type="range" min={min} max={max} step={0.001} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 accent-amber-400" /><input aria-label={`${label} em porcentagem`} type="number" min={min * 100} max={max * 100} step={0.1} value={(value * 100).toFixed(1)} onChange={(event) => onChange(clamp(Number(event.target.value) / 100, min, max))} className="h-7 rounded-md border border-white/10 bg-black/35 px-1 text-center font-mono text-[10px] text-gray-200 outline-none focus:border-amber-400" /></label>
}

export function ChampionCardStudio() {
  const [layout, setLayout] = useState<ChampionCardLayout>(DEFAULT_CHAMPION_CARD_LAYOUT)
  const [teamName, setTeamName] = useState("TIMBAS FC")
  const [tournamentName, setTournamentName] = useState("COPA TIMBAS")
  const [playersText, setPlayersText] = useState(SAMPLE_PLAYERS.join("\n"))
  const [qrUrl, setQrUrl] = useState("")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const players = playersText.split(/[,\n]/).map((name) => name.trim()).filter(Boolean)
  const data: ChampionCardData = {
    tournamentName,
    team: { id: "preview", name: teamName, logoUrl: null },
    players: players.map((playerName) => ({ playerName, appearances: 1 })),
  }

  useEffect(() => {
    setQrUrl(publicTournamentUrl("exemplo"))
    void getAdminAwardCardSettings().then((settings) => {
      setLayout({ ...DEFAULT_CHAMPION_CARD_LAYOUT, ...settings.campeao })
    }).catch(() => setNotice("Usando o layout padrão do campeão; a API não respondeu."))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let active = true
    void renderChampionCard(canvas, data, qrUrl, layout).catch(() => {
      if (active) setNotice("Não foi possível atualizar a prévia do campeão.")
    })
    return () => { active = false }
  }, [layout, playersText, qrUrl, teamName, tournamentName])

  const update = (patch: Partial<ChampionCardLayout>) => setLayout((current) => ({ ...current, ...patch }))

  async function save() {
    setSaving(true)
    setNotice("")
    try {
      const saved = await saveAdminAwardCardSettings({ campeao: layout })
      setLayout({ ...DEFAULT_CHAMPION_CARD_LAYOUT, ...saved.campeao })
      setNotice("Layout do campeão salvo. As cartas oficiais já usarão estes ajustes.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar o campeão.")
    } finally {
      setSaving(false)
    }
  }

  async function download() {
    const canvas = document.createElement("canvas")
    await renderChampionCard(canvas, data, qrUrl, layout)
    const link = document.createElement("a")
    link.download = "campeao-previa-2240x2800.png"
    link.href = canvas.toDataURL("image/png", 1)
    link.click()
  }

  return <div className="mt-8 border-t border-amber-400/15 pt-6">
    <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">Carta especial</p><h4 className="mt-1 text-sm font-black text-white">Editor do time campeão</h4><p className="mt-1 text-[11px] text-gray-500">Ajuste time, campeonato, área do elenco e QR. A prévia e o PNG usam 2240 × 2800.</p></div>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[390px_minmax(420px,1fr)]">
      <div className="min-w-0 space-y-4 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
        <label className="block space-y-1 text-[10px] font-bold text-gray-500">Fonte<select value={layout.font} onChange={(event) => update({ font: event.target.value as ChampionCardLayout["font"] })} className="h-10 w-full rounded-xl border border-white/10 bg-[#0b0b10] px-3 text-xs text-white outline-none focus:border-amber-400">{AWARD_FONT_OPTIONS.map((font) => <option key={font.key} value={font.key}>{font.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-[10px] font-bold text-gray-500">Nome do time<input value={teamName} onChange={(event) => setTeamName(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label><label className="space-y-1 text-[10px] font-bold text-gray-500">Campeonato<input value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label></div>
        <label className="block space-y-1 text-[10px] font-bold text-gray-500">Jogadores, um por linha<textarea value={playersText} onChange={(event) => setPlayersText(event.target.value)} rows={5} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none focus:border-amber-400" /></label>
        <label className="block space-y-1 text-[10px] font-bold text-gray-500">Link do QR<input value={qrUrl} onChange={(event) => setQrUrl(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label>
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/25 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-white">Nome do time</p><RangeControl label="Horizontal" value={layout.teamX} min={0.15} max={0.85} onChange={(teamX) => update({ teamX })} /><RangeControl label="Vertical" value={layout.teamY} min={0.55} max={0.75} onChange={(teamY) => update({ teamY })} /><RangeControl label="Tamanho" value={layout.teamSize} min={0.025} max={0.1} onChange={(teamSize) => update({ teamSize })} /><RangeControl label="Largura" value={layout.teamWidth} min={0.3} max={0.85} onChange={(teamWidth) => update({ teamWidth })} /></div>
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/25 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-white">Campeonato</p><RangeControl label="Horizontal" value={layout.tournamentX} min={0.15} max={0.85} onChange={(tournamentX) => update({ tournamentX })} /><RangeControl label="Vertical" value={layout.tournamentY} min={0.58} max={0.78} onChange={(tournamentY) => update({ tournamentY })} /><RangeControl label="Tamanho" value={layout.tournamentSize} min={0.012} max={0.06} onChange={(tournamentSize) => update({ tournamentSize })} /><RangeControl label="Largura" value={layout.tournamentWidth} min={0.3} max={0.85} onChange={(tournamentWidth) => update({ tournamentWidth })} /></div>
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/25 p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-white">Elenco</p><label className="flex items-center gap-2 text-[10px] font-bold text-gray-500">Colunas<select value={layout.rosterColumns} onChange={(event) => update({ rosterColumns: Number(event.target.value) })} className="h-7 rounded-md border border-white/10 bg-black px-2 text-white"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label></div><RangeControl label="Horizontal" value={layout.rosterX} min={0.1} max={0.65} onChange={(rosterX) => update({ rosterX })} /><RangeControl label="Vertical" value={layout.rosterY} min={0.7} max={0.86} onChange={(rosterY) => update({ rosterY })} /><RangeControl label="Largura" value={layout.rosterWidth} min={0.2} max={0.65} onChange={(rosterWidth) => update({ rosterWidth })} /><RangeControl label="Altura" value={layout.rosterHeight} min={0.04} max={0.16} onChange={(rosterHeight) => update({ rosterHeight })} /><RangeControl label="Fonte máxima" value={layout.rosterSize} min={0.007} max={0.04} onChange={(rosterSize) => update({ rosterSize })} /></div>
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/25 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-white">QR Code</p><RangeControl label="Horizontal" value={layout.qrX} min={0.5} max={0.86} onChange={(qrX) => update({ qrX })} /><RangeControl label="Vertical" value={layout.qrY} min={0.65} max={0.86} onChange={(qrY) => update({ qrY })} /><RangeControl label="Tamanho" value={layout.qrSize} min={0.06} max={0.2} onChange={(qrSize) => update({ qrSize })} /></div>
        <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => setLayout(DEFAULT_CHAMPION_CARD_LAYOUT)} className="gap-2 border-white/10"><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button><Button type="button" onClick={() => void save()} disabled={saving} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"><Save className="h-3.5 w-3.5" />{saving ? "Salvando" : "Salvar"}</Button></div>
        <Button type="button" onClick={() => void download()} className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-400"><Download className="h-4 w-4" />Baixar prévia em alta</Button>
        {notice && <p className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-2 text-[10px] text-gray-400">{notice}</p>}
      </div>
      <div className="min-w-0"><div className="mb-2 text-right text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">2240 × 2800</div><canvas ref={canvasRef} className="mx-auto block aspect-[4/5] w-full max-w-[620px] rounded-2xl bg-black object-contain shadow-2xl ring-1 ring-white/10" aria-label="Prévia da carta do campeão" /></div>
    </div>
  </div>
}
