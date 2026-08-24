"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Download, Move, QrCode, RotateCcw, Save, Type } from "lucide-react"
import "@fontsource/anton"
import "@fontsource/tourney/600.css"
import "@fontsource/cinzel-decorative/700.css"
import "@fontsource/black-ops-one"
import "@fontsource/graduate"
import "@fontsource/teko/600.css"
import { Button } from "@/components/ui/button"
import {
  AWARD_CARD_CONFIG,
  AWARD_FONT_FAMILY,
  AWARD_FONT_OPTIONS,
  awardLayoutsFromDefaults,
  layoutOf,
  type AwardCardKey,
  type AwardCardLayout,
} from "@/lib/award-card-config"
import { AWARD_FONT_WEIGHT, renderAwardCard } from "@/lib/award-card-render"
import { createCenteredAwardQr } from "@/lib/award-qr"
import { getAdminAwardCardSettings, saveAdminAwardCardSettings } from "@/lib/services/award-cards"
import { publicTournamentUrl } from "@/lib/public-site-url"

type EditableElement = "nick" | "stat" | "qr"

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function RangeControl({ label, value, min, max, step = 0.001, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="grid grid-cols-[86px_1fr_54px] items-center gap-2 text-[10px] font-bold text-gray-500"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="accent-amber-400" /><span className="rounded-md bg-black/35 px-1.5 py-1 text-center font-mono text-gray-300">{(value * 100).toFixed(1)}</span></label>
}

export function AwardCardStudio() {
  const [category, setCategory] = useState<AwardCardKey>("muralha")
  const [layouts, setLayouts] = useState(awardLayoutsFromDefaults)
  const [selected, setSelected] = useState<EditableElement>("nick")
  const [nickname, setNickname] = useState("Indio")
  const [achievement, setAchievement] = useState(AWARD_CARD_CONFIG.muralha.value)
  const [qrUrl, setQrUrl] = useState("")
  const [qrPreview, setQrPreview] = useState("")
  const [guides, setGuides] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const previewRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<EditableElement | null>(null)

  const layout = layouts[category]
  const base = AWARD_CARD_CONFIG[category]
  const award = useMemo(() => ({ ...base, ...layout }), [base, layout])
  const family = AWARD_FONT_FAMILY[layout.font]
  const weight = AWARD_FONT_WEIGHT[layout.font]

  useEffect(() => {
    setQrUrl(publicTournamentUrl("exemplo"))
    void getAdminAwardCardSettings().then((saved) => {
      setLayouts((current) => ({ ...current, ...saved }))
    }).catch(() => setNotice("Usando os ajustes padrão; a API de layouts não respondeu."))
  }, [])

  useEffect(() => {
    if (!qrUrl.trim()) return setQrPreview("")
    void createCenteredAwardQr(qrUrl.trim(), award.color, 320).then(setQrPreview)
  }, [award.color, qrUrl])

  function updateLayout(patch: Partial<AwardCardLayout>) {
    setLayouts((current) => ({ ...current, [category]: { ...current[category], ...patch } }))
  }

  function changeCategory(next: AwardCardKey) {
    setCategory(next)
    setAchievement(AWARD_CARD_CONFIG[next].value)
    setSelected("nick")
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1)
    if (dragging.current === "nick") updateLayout({ nickX: x, nickY: y })
    if (dragging.current === "stat") updateLayout({ statX: x, statY: y })
    if (dragging.current === "qr") updateLayout({
      qrX: clamp(x - layout.qrSize / 2, 0, 1 - layout.qrSize),
      qrY: clamp(y - layout.qrSize * 0.4, 0, 1 - layout.qrSize * 0.8),
    })
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>, element: EditableElement) {
    event.preventDefault()
    dragging.current = element
    setSelected(element)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  async function save() {
    setSaving(true)
    setNotice("")
    try {
      const saved = await saveAdminAwardCardSettings(layouts)
      setLayouts((current) => ({ ...current, ...saved }))
      setNotice("Layouts salvos. Os downloads oficiais já usarão estes ajustes.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar os layouts.")
    } finally {
      setSaving(false)
    }
  }

  async function download() {
    const canvas = document.createElement("canvas")
    await renderAwardCard(canvas, award, nickname, achievement, qrUrl)
    const link = document.createElement("a")
    link.download = `${category}-${nickname || "jogador"}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.-]+/gi, "-").toLowerCase() + ".png"
    link.href = canvas.toDataURL("image/png", 1)
    link.click()
  }

  const selectedX = selected === "nick" ? layout.nickX : selected === "stat" ? layout.statX : layout.qrX + layout.qrSize / 2
  const selectedY = selected === "nick" ? layout.nickY : selected === "stat" ? layout.statY : layout.qrY + layout.qrSize * 0.4
  const nickScale = Math.min(1, 12 / Math.max(nickname.trim().length, 1))
  const statScale = Math.min(1, 18 / Math.max(achievement.trim().length, 1))

  return <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[370px_minmax(420px,1fr)]">
    <div className="min-w-0 space-y-4 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
      <div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Categoria</p><div className="grid grid-cols-2 gap-2">{(Object.keys(AWARD_CARD_CONFIG) as AwardCardKey[]).map((key) => <button key={key} type="button" onClick={() => changeCategory(key)} className={`min-h-10 rounded-xl border px-2 text-[10px] font-black transition ${category === key ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/[0.025] text-gray-400 hover:text-white"}`}>{AWARD_CARD_CONFIG[key].title}</button>)}</div></div>
      <label className="block space-y-1.5 text-[10px] font-bold text-gray-500">Fonte<select value={layout.font} onChange={(event) => updateLayout({ font: event.target.value as AwardCardLayout["font"] })} className="h-10 w-full rounded-xl border border-white/10 bg-[#0b0b10] px-3 text-xs text-white outline-none focus:border-amber-400">{AWARD_FONT_OPTIONS.map((font) => <option key={font.key} value={font.key}>{font.label}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-[10px] font-bold text-gray-500">Nick<input value={nickname} maxLength={28} onChange={(event) => setNickname(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label><label className="space-y-1 text-[10px] font-bold text-gray-500">Feito<input value={achievement} maxLength={34} onChange={(event) => setAchievement(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label></div>
      <label className="block space-y-1 text-[10px] font-bold text-gray-500">Link do QR<input value={qrUrl} onChange={(event) => setQrUrl(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white outline-none focus:border-amber-400" /></label>
      <div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Elemento para ajustar</p><div className="grid grid-cols-3 gap-2">{([{ key: "nick", label: "Nick", icon: Type }, { key: "stat", label: "Feito", icon: Move }, { key: "qr", label: "QR", icon: QrCode }] as const).map((item) => <button key={item.key} type="button" onClick={() => setSelected(item.key)} className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[10px] font-black ${selected === item.key ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-gray-500"}`}><item.icon className="h-3.5 w-3.5" />{item.label}</button>)}</div></div>
      <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/25 p-3">
        {selected === "nick" && <><RangeControl label="Horizontal" value={layout.nickX} min={0.15} max={0.85} onChange={(nickX) => updateLayout({ nickX })} /><RangeControl label="Vertical" value={layout.nickY} min={0.5} max={0.92} onChange={(nickY) => updateLayout({ nickY })} /><RangeControl label="Tamanho" value={layout.nickSize} min={0.025} max={0.12} onChange={(nickSize) => updateLayout({ nickSize })} /></>}
        {selected === "stat" && <><RangeControl label="Horizontal" value={layout.statX} min={0.15} max={0.85} onChange={(statX) => updateLayout({ statX })} /><RangeControl label="Vertical" value={layout.statY} min={0.55} max={0.95} onChange={(statY) => updateLayout({ statY })} /><RangeControl label="Tamanho" value={layout.statSize} min={0.02} max={0.09} onChange={(statSize) => updateLayout({ statSize })} /></>}
        {selected === "qr" && <><RangeControl label="Horizontal" value={layout.qrX} min={0.4} max={0.9} onChange={(qrX) => updateLayout({ qrX })} /><RangeControl label="Vertical" value={layout.qrY} min={0.5} max={0.9} onChange={(qrY) => updateLayout({ qrY })} /><RangeControl label="Tamanho" value={layout.qrSize} min={0.06} max={0.22} onChange={(qrSize) => updateLayout({ qrSize })} /></>}
        {selected !== "qr" && <RangeControl label="Largura máx." value={layout.textWidth} min={0.2} max={0.7} onChange={(textWidth) => updateLayout({ textWidth })} />}
      </div>
      <label className="flex items-center justify-between rounded-xl border border-white/[0.07] px-3 py-2 text-[10px] font-bold text-gray-400">Guias de alinhamento<input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} className="accent-amber-400" /></label>
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => updateLayout(layoutOf(AWARD_CARD_CONFIG[category]))} className="gap-2 border-white/10"><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button><Button type="button" onClick={() => void save()} disabled={saving} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"><Save className="h-3.5 w-3.5" />{saving ? "Salvando" : "Salvar"}</Button></div>
      <Button type="button" onClick={() => void download()} className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-400"><Download className="h-4 w-4" />Baixar PNG desta prévia</Button>
      {notice && <p className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-2 text-[10px] leading-relaxed text-gray-400">{notice}</p>}
    </div>
    <div className="min-w-0"><div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-gray-500"><span>Editor visual · arraste o elemento selecionado</span><span>1122 × 1402</span></div>
      <div ref={previewRef} onPointerMove={move} onPointerUp={() => { dragging.current = null }} onPointerCancel={() => { dragging.current = null }} className="relative mx-auto aspect-[4/5] w-full max-w-[620px] touch-none overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10" style={{ containerType: "inline-size" }}>
        <img src={award.image} alt={`Template ${award.title}`} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        {guides && <><span className="pointer-events-none absolute inset-y-0 w-px bg-emerald-300/55" style={{ left: `${selectedX * 100}%` }} /><span className="pointer-events-none absolute inset-x-0 h-px bg-emerald-300/55" style={{ top: `${selectedY * 100}%` }} /></>}
        <button type="button" onPointerDown={(event) => beginDrag(event, "nick")} className={`absolute cursor-move whitespace-nowrap border border-dashed px-1 text-center uppercase leading-none ${selected === "nick" ? "border-emerald-300/80 bg-emerald-300/5" : "border-transparent"}`} style={{ color: "#f4f6f8", fontFamily: family, fontWeight: weight, fontSize: `${layout.nickSize * 100}cqw`, left: `${layout.nickX * 100}%`, top: `${layout.nickY * 100}%`, maxWidth: `${layout.textWidth * 100}%`, transform: `translate(-50%,-50%) scale(${nickScale})` }}>{nickname || "Jogador"}</button>
        <button type="button" onPointerDown={(event) => beginDrag(event, "stat")} className={`absolute cursor-move whitespace-nowrap border border-dashed px-1 text-center uppercase leading-none ${selected === "stat" ? "border-emerald-300/80 bg-emerald-300/5" : "border-transparent"}`} style={{ color: award.highlight, fontFamily: family, fontWeight: weight, fontSize: `${layout.statSize * 100}cqw`, left: `${layout.statX * 100}%`, top: `${layout.statY * 100}%`, maxWidth: `${layout.textWidth * 100}%`, transform: `translate(-50%,-50%) scale(${statScale})` }}>{achievement || "0"}</button>
        {qrPreview && <button type="button" onPointerDown={(event) => beginDrag(event, "qr")} className={`absolute block cursor-move border border-dashed ${selected === "qr" ? "border-emerald-300/90 bg-emerald-300/5" : "border-transparent"}`} style={{ left: `${layout.qrX * 100}%`, top: `${layout.qrY * 100}%`, width: `${layout.qrSize * 100}%`, aspectRatio: "1" }}><img src={qrPreview} alt="QR Code" className="h-full w-full" /></button>}
      </div>
    </div>
  </div>
}
