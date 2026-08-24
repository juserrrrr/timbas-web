"use client"

import { useEffect, useState } from "react"
import { Download, ExternalLink, QrCode } from "lucide-react"
import QRCode from "qrcode"
import "@fontsource/bebas-neue"
import { Button } from "@/components/ui/button"
import { AWARD_CARD_CONFIG as AWARDS, type AwardCardKey as AwardKey } from "@/lib/award-card-config"

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialSize: number) {
  let size = initialSize
  do {
    ctx.font = `400 ${size}px "Bebas Neue", Impact, sans-serif`
    size -= 2
  } while (size > 30 && ctx.measureText(text).width > maxWidth)
}

export function AwardCardStudio() {
  const [category, setCategory] = useState<AwardKey>("artilheiro")
  const [name, setName] = useState("Indio")
  const [value, setValue] = useState(AWARDS.artilheiro.value)
  const [tournamentUrl, setTournamentUrl] = useState("")
  const [qrPreview, setQrPreview] = useState("")
  const award = AWARDS[category]

  useEffect(() => { setTournamentUrl(`${window.location.origin}/dashboard/tournaments/exemplo`) }, [])
  useEffect(() => {
    if (!tournamentUrl.trim()) return setQrPreview("")
    void QRCode.toDataURL(tournamentUrl.trim(), { margin: 1, width: 256, color: { dark: "#050505", light: award.qrLight } }).then(setQrPreview)
  }, [award.qrLight, tournamentUrl])

  function changeCategory(next: AwardKey) {
    setCategory(next)
    setValue(AWARDS[next].value)
  }

  async function download() {
    await document.fonts.load('400 100px "Bebas Neue"')
    const background = new Image()
    background.src = award.image
    await background.decode()
    const canvas = document.createElement("canvas")
    canvas.width = background.naturalWidth
    canvas.height = background.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(background, 0, 0)
    const nick = (name.trim() || "Jogador").slice(0, 28)
    const achievement = (value.trim() || "0").toUpperCase().slice(0, 34)
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.lineJoin = "round"
    ctx.shadowColor = "rgba(0,0,0,.95)"
    ctx.shadowBlur = canvas.width * 0.012
    ctx.strokeStyle = "rgba(0,0,0,.85)"
    ctx.lineWidth = canvas.width * 0.006
    ctx.fillStyle = "#fff"
    fitText(ctx, nick, canvas.width * award.textWidth, canvas.width * 0.068)
    ctx.strokeText(nick, canvas.width * award.nickX, canvas.height * award.nickY)
    ctx.fillText(nick, canvas.width * award.nickX, canvas.height * award.nickY)
    ctx.fillStyle = award.color
    fitText(ctx, achievement, canvas.width * award.textWidth, canvas.width * 0.046)
    ctx.strokeText(achievement, canvas.width * award.statX, canvas.height * award.statY)
    ctx.fillText(achievement, canvas.width * award.statX, canvas.height * award.statY)
    if (tournamentUrl.trim()) {
      const qr = new Image()
      qr.src = await QRCode.toDataURL(tournamentUrl.trim(), { margin: 1, width: 320, color: { dark: "#050505", light: award.qrLight } })
      await qr.decode()
      const size = canvas.width * award.qrSize
      const x = canvas.width * award.qrX
      const y = canvas.height * award.qrY
      ctx.shadowBlur = 0
      ctx.fillStyle = award.color
      ctx.fillRect(x - 5, y - 5, size + 10, size + 10)
      ctx.drawImage(qr, x, y, size, size)
    }
    const link = document.createElement("a")
    link.download = `${category}-${nick}.png`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.-]+/gi, "-").toLowerCase()
    link.href = canvas.toDataURL("image/png", 1)
    link.click()
  }

  return (
    <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[minmax(420px,1fr)_minmax(320px,440px)]">
      <div className="min-w-0 space-y-5 rounded-2xl border border-white/[0.07] bg-black/25 p-4 sm:p-5">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Categoria fixa</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(AWARDS) as AwardKey[]).map((key) => <button key={key} type="button" onClick={() => changeCategory(key)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-black transition ${category === key ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/[0.025] text-gray-400 hover:border-white/20 hover:text-white"}`}>{AWARDS[key].title}</button>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-[11px] font-bold text-gray-400">Nick<input value={name} maxLength={28} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-amber-400" /></label>
          <label className="space-y-1.5 text-[11px] font-bold text-gray-400">Feito<input value={value} maxLength={34} onChange={(event) => setValue(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-amber-400" /></label>
          <label className="space-y-1.5 text-[11px] font-bold text-gray-400 sm:col-span-2">Destino do QR Code<div className="relative"><QrCode className="absolute left-3 top-3.5 h-4 w-4 text-gray-600" /><input value={tournamentUrl} onChange={(event) => setTournamentUrl(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-400" /></div></label>
        </div>
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-3 text-[11px] leading-relaxed text-emerald-200/80"><strong className="text-emerald-300">Sem IA na geração.</strong> Categoria e arte já estão gravadas no template. O navegador adiciona somente nick, feito e QR Code.</div>
        <Button type="button" onClick={() => void download()} className="h-11 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500"><Download className="h-4 w-4" />Baixar amostra em alta qualidade</Button>
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Prévia real</span><span className="flex items-center gap-1 text-[10px] text-gray-600"><ExternalLink className="h-3 w-3" />4:5</span></div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
          <img src={award.image} alt={`Template ${award.title}`} className="absolute inset-0 h-full w-full object-cover" />
          <p className="absolute w-[52%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[clamp(26px,4.5vw,39px)] leading-none text-white [font-family:'Bebas_Neue',Impact,sans-serif] [-webkit-text-stroke:1px_rgba(0,0,0,.7)] drop-shadow-[0_3px_3px_rgba(0,0,0,1)]" style={{ left: `${award.nickX * 100}%`, top: `${award.nickY * 100}%` }}>{name || "Jogador"}</p>
          <p className="absolute w-[52%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[clamp(17px,3vw,25px)] leading-none [font-family:'Bebas_Neue',Impact,sans-serif] [-webkit-text-stroke:1px_rgba(0,0,0,.7)] drop-shadow-[0_3px_3px_rgba(0,0,0,1)]" style={{ color: award.color, left: `${award.statX * 100}%`, top: `${award.statY * 100}%` }}>{value || "0"}</p>
          {qrPreview && <span className="absolute block p-[2px]" style={{ backgroundColor: award.color, left: `${award.qrX * 100}%`, top: `${award.qrY * 100}%`, width: `${award.qrSize * 100}%`, height: `${award.qrSize * 80}%` }}><img src={qrPreview} alt="QR Code do campeonato" className="h-full w-full" /></span>}
        </div>
      </div>
    </div>
  )
}
