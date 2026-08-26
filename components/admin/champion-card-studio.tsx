"use client"

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Download, QrCode, RotateCcw, Save, Trophy, Type, Users } from "lucide-react"
import "@fontsource/anton"
import "@fontsource/tourney/600.css"
import "@fontsource/cinzel-decorative/700.css"
import "@fontsource/black-ops-one"
import "@fontsource/graduate"
import "@fontsource/teko/600.css"
import { Button } from "@/components/ui/button"
import { AWARD_FONT_FAMILY, AWARD_FONT_OPTIONS } from "@/lib/award-card-config"
import { AWARD_FONT_WEIGHT } from "@/lib/award-card-render"
import { createCenteredAwardQr } from "@/lib/award-qr"
import { DEFAULT_CHAMPION_CARD_LAYOUT, type ChampionCardLayout } from "@/lib/champion-card-config"
import { renderChampionCard, type ChampionCardData } from "@/lib/champion-card-render"
import { publicTournamentUrl } from "@/lib/public-site-url"
import { getAdminAwardCardSettings, saveAdminAwardCardSettings } from "@/lib/services/award-cards"

type EditableElement = "team" | "tournament" | "roster" | "qr"

const SAMPLE_PLAYERS = ["Indio", "Matheus", "Gabriel", "Rafael", "Lucas", "Bruno", "Diego", "Felipe", "Gustavo", "Henrique", "João", "Pedro", "Caio", "Vinícius"]
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function RangeControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(() => (value * 100).toFixed(2))
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft((value * 100).toFixed(2))
  }, [value])
  const updatePercent = (raw: string) => {
    setDraft(raw)
    const percent = Number(raw.replace(",", "."))
    if (Number.isFinite(percent)) onChange(clamp(percent / 100, min, max))
  }
  return <label className="grid grid-cols-[78px_1fr_68px] items-center gap-2 text-[10px] font-bold text-gray-500"><span>{label}</span><input type="range" min={min} max={max} step={0.0001} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 accent-amber-400" /><input ref={inputRef} aria-label={`${label} em porcentagem`} type="number" min={min * 100} max={max * 100} step={0.01} value={draft} onChange={(event) => updatePercent(event.target.value)} onBlur={() => setDraft((value * 100).toFixed(2))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }} className="h-7 w-full rounded-md border border-white/10 bg-black/35 px-1 text-center font-mono text-[10px] text-gray-200 outline-none focus:border-amber-400" /></label>
}

function playersInVisualOrder(players: string[], columns: number) {
  const rows = Math.ceil(players.length / columns)
  return Array.from({ length: players.length }, (_, index) => players[(index % columns) * rows + Math.floor(index / columns)]).filter(Boolean)
}

function rosterDividerPositions(columns: number) {
  if (columns === 2) return []
  return Array.from({ length: columns - 1 }, (_, index) => index + 1)
    .filter((divider) => !(columns === 4 && divider === 2))
    .map((divider) => divider / columns)
}

export function ChampionCardStudio() {
  const [layout, setLayout] = useState<ChampionCardLayout>(DEFAULT_CHAMPION_CARD_LAYOUT)
  const [selected, setSelected] = useState<EditableElement>("team")
  const [teamName, setTeamName] = useState("TIMBAS FC")
  const [tournamentName, setTournamentName] = useState("COPA TIMBAS")
  const [playersText, setPlayersText] = useState(SAMPLE_PLAYERS.join("\n"))
  const [qrUrl, setQrUrl] = useState("")
  const [qrPreview, setQrPreview] = useState("")
  const [guides, setGuides] = useState(true)
  const [selectionFrames, setSelectionFrames] = useState(true)
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<EditableElement | null>(null)

  const players = playersText.split(/[,\n]/).map((name) => name.trim()).filter(Boolean)
  const family = AWARD_FONT_FAMILY[layout.font]
  const weight = AWARD_FONT_WEIGHT[layout.font]
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
    if (!qrUrl.trim()) return setQrPreview("")
    let active = true
    void createCenteredAwardQr(qrUrl.trim(), "#c9a85d", 384).then((image) => {
      if (active) setQrPreview(image)
    }).catch(() => {
      if (active) setQrPreview("")
    })
    return () => { active = false }
  }, [qrUrl])

  const update = (patch: Partial<ChampionCardLayout>) => setLayout((current) => ({ ...current, ...patch }))

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1)
    if (dragging.current === "team") update({ teamX: x, teamY: y })
    if (dragging.current === "tournament") update({ tournamentX: x, tournamentY: y })
    if (dragging.current === "roster") update({
      rosterX: clamp(x - layout.rosterWidth / 2, 0, 1 - layout.rosterWidth),
      rosterY: clamp(y - layout.rosterHeight / 2, 0, 1 - layout.rosterHeight),
    })
    if (dragging.current === "qr") update({
      qrX: clamp(x - layout.qrSize / 2, 0, 1 - layout.qrSize),
      qrY: clamp(y - layout.qrSize / 2, 0, 1 - layout.qrSize),
    })
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>, element: EditableElement) {
    event.preventDefault()
    dragging.current = element
    setSelected(element)
    previewRef.current?.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function selectElement(element: EditableElement) {
    setSelected(element)
    requestAnimationFrame(() => previewRef.current?.focus({ preventScroll: true }))
  }

  function returnFocusToPreview() {
    requestAnimationFrame(() => previewRef.current?.focus({ preventScroll: true }))
  }

  function nudgeSelected(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as string[]).includes(event.key)) return
    event.preventDefault()
    const amount = event.ctrlKey || event.metaKey ? 0.01 : event.shiftKey ? 0.001 : 0.0001
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0
    if (selected === "team") update({ teamX: clamp(layout.teamX + dx, 0.15, 0.85), teamY: clamp(layout.teamY + dy, 0.55, 0.75) })
    if (selected === "tournament") update({ tournamentX: clamp(layout.tournamentX + dx, 0.15, 0.85), tournamentY: clamp(layout.tournamentY + dy, 0.58, 0.78) })
    if (selected === "roster") update({ rosterX: clamp(layout.rosterX + dx, 0.1, 0.65), rosterY: clamp(layout.rosterY + dy, 0.7, 0.86) })
    if (selected === "qr") update({ qrX: clamp(layout.qrX + dx, 0.5, 0.86), qrY: clamp(layout.qrY + dy, 0.65, 0.86) })
  }

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

  const selectedX = selected === "team" ? layout.teamX : selected === "tournament" ? layout.tournamentX : selected === "roster" ? layout.rosterX + layout.rosterWidth / 2 : layout.qrX + layout.qrSize / 2
  const selectedY = selected === "team" ? layout.teamY : selected === "tournament" ? layout.tournamentY : selected === "roster" ? layout.rosterY + layout.rosterHeight / 2 : layout.qrY + layout.qrSize / 2
  const rows = Math.max(1, Math.ceil(players.length / layout.rosterColumns))
  const rosterFontSize = Math.max(0.7, Math.min(layout.rosterSize * 100, layout.rosterHeight * 100 / rows * 0.64))

  return <div className="mt-8 border-t border-amber-400/15 pt-6">
    <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">Carta especial</p><h4 className="mt-1 text-sm font-black text-white">Editor do time campeão</h4><p className="mt-1 text-[11px] text-gray-500">Clique e arraste time, campeonato, elenco ou QR diretamente na carta. A prévia e o PNG usam 2240 × 2800.</p></div>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[390px_minmax(420px,1fr)]">
      <div className="min-w-0 space-y-4 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
        <label className="block space-y-1 text-[10px] font-bold text-gray-500">Fonte<select value={layout.font} onChange={(event) => update({ font: event.target.value as ChampionCardLayout["font"] })} className="h-10 w-full rounded-xl border border-white/10 bg-[#0b0b10] px-3 text-xs text-white outline-none focus:border-amber-400">{AWARD_FONT_OPTIONS.map((font) => <option key={font.key} value={font.key}>{font.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-[10px] font-bold text-gray-500">Nome do time<input value={teamName} onChange={(event) => setTeamName(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label><label className="space-y-1 text-[10px] font-bold text-gray-500">Campeonato<input value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label></div>
        <label className="block space-y-1 text-[10px] font-bold text-gray-500">Jogadores, um por linha<textarea value={playersText} onChange={(event) => setPlayersText(event.target.value)} rows={5} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none focus:border-amber-400" /></label>
        <label className="block space-y-1 text-[10px] font-bold text-gray-500">Link do QR<input value={qrUrl} onChange={(event) => setQrUrl(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label>
        <div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Elemento para ajustar</p><div className="grid grid-cols-4 gap-2">{([{ key: "team", label: "Time", icon: Type }, { key: "tournament", label: "Copa", icon: Trophy }, { key: "roster", label: "Elenco", icon: Users }, { key: "qr", label: "QR", icon: QrCode }] as const).map((item) => <button key={item.key} type="button" onClick={() => selectElement(item.key)} className={`flex h-10 items-center justify-center gap-1 rounded-xl border text-[9px] font-black ${selected === item.key ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-gray-500"}`}><item.icon className="h-3 w-3" />{item.label}</button>)}</div></div>
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/25 p-3">
          {selected === "team" && <><RangeControl label="Horizontal" value={layout.teamX} min={0.15} max={0.85} onChange={(teamX) => update({ teamX })} /><RangeControl label="Vertical" value={layout.teamY} min={0.55} max={0.75} onChange={(teamY) => update({ teamY })} /><RangeControl label="Tamanho" value={layout.teamSize} min={0.025} max={0.1} onChange={(teamSize) => update({ teamSize })} /><RangeControl label="Largura" value={layout.teamWidth} min={0.3} max={0.85} onChange={(teamWidth) => update({ teamWidth })} /></>}
          {selected === "tournament" && <><RangeControl label="Horizontal" value={layout.tournamentX} min={0.15} max={0.85} onChange={(tournamentX) => update({ tournamentX })} /><RangeControl label="Vertical" value={layout.tournamentY} min={0.58} max={0.78} onChange={(tournamentY) => update({ tournamentY })} /><RangeControl label="Tamanho" value={layout.tournamentSize} min={0.012} max={0.06} onChange={(tournamentSize) => update({ tournamentSize })} /><RangeControl label="Largura" value={layout.tournamentWidth} min={0.3} max={0.85} onChange={(tournamentWidth) => update({ tournamentWidth })} /></>}
          {selected === "roster" && <><div className="flex items-center justify-between pb-1"><span className="text-[10px] font-bold text-gray-500">Colunas do elenco</span><select value={layout.rosterColumns} onChange={(event) => update({ rosterColumns: Number(event.target.value) })} className="h-7 rounded-md border border-white/10 bg-black px-2 text-[10px] text-white"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></div><RangeControl label="Horizontal" value={layout.rosterX} min={0.1} max={0.65} onChange={(rosterX) => update({ rosterX })} /><RangeControl label="Vertical" value={layout.rosterY} min={0.7} max={0.86} onChange={(rosterY) => update({ rosterY })} /><RangeControl label="Largura" value={layout.rosterWidth} min={0.2} max={0.65} onChange={(rosterWidth) => update({ rosterWidth })} /><RangeControl label="Altura" value={layout.rosterHeight} min={0.04} max={0.16} onChange={(rosterHeight) => update({ rosterHeight })} /><RangeControl label="Fonte máxima" value={layout.rosterSize} min={0.007} max={0.04} onChange={(rosterSize) => update({ rosterSize })} /></>}
          {selected === "qr" && <><RangeControl label="Horizontal" value={layout.qrX} min={0.5} max={0.86} onChange={(qrX) => update({ qrX })} /><RangeControl label="Vertical" value={layout.qrY} min={0.65} max={0.86} onChange={(qrY) => update({ qrY })} /><RangeControl label="Tamanho" value={layout.qrSize} min={0.06} max={0.2} onChange={(qrSize) => update({ qrSize })} /></>}
        </div>
        <div className="grid grid-cols-2 gap-2"><label className="flex items-center justify-between rounded-xl border border-white/[0.07] px-3 py-2 text-[10px] font-bold text-gray-400">Guias<input type="checkbox" checked={guides} onChange={(event) => { setGuides(event.target.checked); returnFocusToPreview() }} className="accent-amber-400" /></label><label className="flex items-center justify-between rounded-xl border border-white/[0.07] px-3 py-2 text-[10px] font-bold text-gray-400">Contornos<input type="checkbox" checked={selectionFrames} onChange={(event) => { setSelectionFrames(event.target.checked); returnFocusToPreview() }} className="accent-amber-400" /></label></div>
        <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => setLayout(DEFAULT_CHAMPION_CARD_LAYOUT)} className="gap-2 border-white/10"><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button><Button type="button" onClick={() => void save()} disabled={saving} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"><Save className="h-3.5 w-3.5" />{saving ? "Salvando" : "Salvar"}</Button></div>
        <Button type="button" onClick={() => void download()} className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-400"><Download className="h-4 w-4" />Baixar prévia em alta</Button>
        {notice && <p className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-2 text-[10px] text-gray-400">{notice}</p>}
      </div>
      <div className="min-w-0"><div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-gray-500"><span>Setas 0,01 · Shift 0,1 · Ctrl 1,0</span><span>2240 × 2800</span></div>
        <div ref={previewRef} tabIndex={0} onKeyDown={nudgeSelected} onPointerMove={move} onPointerUp={() => { dragging.current = null }} onPointerCancel={() => { dragging.current = null }} className="relative mx-auto aspect-[4/5] w-full max-w-[620px] touch-none overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-emerald-400/60" style={{ containerType: "inline-size" }}>
          <img src="/images/awards/campeao-template-v3.png" alt="Template da carta do campeão" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
          {guides && <><span className="pointer-events-none absolute inset-y-0 z-20 w-px bg-emerald-300/55" style={{ left: `${selectedX * 100}%` }} /><span className="pointer-events-none absolute inset-x-0 z-20 h-px bg-emerald-300/55" style={{ top: `${selectedY * 100}%` }} /></>}
          <span className="pointer-events-none absolute left-1/2 top-[61.2%] -translate-x-1/2 -translate-y-1/2 font-teko text-[2.6cqw] font-semibold text-[#f3cc72]">CAMPEÃO</span>
          <button type="button" onPointerDown={(event) => beginDrag(event, "team")} className={`absolute flex cursor-move items-center justify-center border border-dashed px-1 text-center uppercase leading-none ${selectionFrames && selected === "team" ? "border-emerald-300/80 bg-emerald-300/5" : "border-transparent"}`} style={{ left: `${layout.teamX * 100}%`, top: `${layout.teamY * 100}%`, width: `${layout.teamWidth * 100}%`, transform: "translate(-50%,-50%)" }}><span className="truncate whitespace-nowrap" style={{ color: "#fff", fontFamily: family, fontWeight: weight, fontSize: `${layout.teamSize * 100}cqw` }}>{teamName || "Time campeão"}</span></button>
          <button type="button" onPointerDown={(event) => beginDrag(event, "tournament")} className={`absolute flex cursor-move items-center justify-center border border-dashed px-1 text-center uppercase leading-none ${selectionFrames && selected === "tournament" ? "border-emerald-300/80 bg-emerald-300/5" : "border-transparent"}`} style={{ left: `${layout.tournamentX * 100}%`, top: `${layout.tournamentY * 100}%`, width: `${layout.tournamentWidth * 100}%`, transform: "translate(-50%,-50%)" }}><span className="truncate whitespace-nowrap" style={{ color: "#c9a85d", fontFamily: family, fontWeight: weight, fontSize: `${layout.tournamentSize * 100}cqw` }}>{tournamentName || "Campeonato"}</span></button>
          <span className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-[#c9a85d]/50 bg-[#050508]/95 px-[1.2cqw] py-[0.15cqw] font-teko text-[1.7cqw] font-semibold text-[#d9bc78]" style={{ left: `${(layout.rosterX + layout.rosterWidth / 2) * 100}%`, top: `${(layout.rosterY - 0.022) * 100}%` }}>{players.length ? "ELENCO CAMPEÃO" : "TÍTULO CONQUISTADO"}</span>
          <button type="button" onPointerDown={(event) => beginDrag(event, "roster")} className={`absolute cursor-move border border-dashed ${selectionFrames && selected === "roster" ? "border-emerald-300/80 bg-emerald-300/5" : "border-transparent"}`} style={{ left: `${layout.rosterX * 100}%`, top: `${layout.rosterY * 100}%`, width: `${layout.rosterWidth * 100}%`, height: `${layout.rosterHeight * 100}%` }}>
            {layout.rosterColumns !== 2 && <span className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[0.28cqw] -translate-x-1/2 bg-[#050508]" />}
            {rosterDividerPositions(layout.rosterColumns).map((position) => <span key={position} className="pointer-events-none absolute inset-y-0 z-0 w-px bg-[#c9a85d]/35" style={{ left: `${position * 100}%` }} />)}
            <span className="relative z-[1] grid h-full content-between items-center uppercase leading-none text-[#f4f1e8]" style={{ gridTemplateColumns: `repeat(${layout.rosterColumns}, minmax(0, 1fr))`, fontFamily: family, fontWeight: weight, fontSize: `${rosterFontSize}cqw` }}>{playersInVisualOrder(players, layout.rosterColumns).map((name, index) => <span key={`${name}-${index}`} className="truncate px-[0.3cqw] text-center">{name}</span>)}</span>
          </button>
          {qrPreview && <button type="button" onPointerDown={(event) => beginDrag(event, "qr")} className={`absolute block cursor-move border border-dashed ${selectionFrames && selected === "qr" ? "border-emerald-300/90 bg-emerald-300/5" : "border-transparent"}`} style={{ left: `${layout.qrX * 100}%`, top: `${layout.qrY * 100}%`, width: `${layout.qrSize * 100}%`, aspectRatio: "1" }}><img src={qrPreview} alt="QR Code" className="h-full w-full" /></button>}
        </div>
      </div>
    </div>
  </div>
}
