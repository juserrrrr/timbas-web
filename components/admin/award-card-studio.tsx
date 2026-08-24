"use client"

import { useEffect, useState } from "react"
import { Download, ExternalLink, QrCode } from "lucide-react"
import QRCode from "qrcode"
import "@fontsource/anton"
import { Button } from "@/components/ui/button"
import { AWARD_CARD_CONFIG as AWARDS, type AwardCardKey as AwardKey } from "@/lib/award-card-config"

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialSize: number) {
  let size = initialSize
  do {
    ctx.font = `400 ${size}px Anton, Impact, sans-serif`
    size -= 2
  } while (size > 30 && ctx.measureText(text).width > maxWidth)
}

function metallicGradient(ctx: CanvasRenderingContext2D, y: number, size: number, top: string, middle: string, bottom: string) {
  const gradient = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55)
  gradient.addColorStop(0, top)
  gradient.addColorStop(0.42, middle)
  gradient.addColorStop(0.58, "#ffffff")
  gradient.addColorStop(1, bottom)
  return gradient
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
    void QRCode.toDataURL(tournamentUrl.trim(), { errorCorrectionLevel: "H", margin: 2, width: 320, color: { dark: award.color, light: "#080808" } }).then(setQrPreview)
  }, [award.color, tournamentUrl])

  function changeCategory(next: AwardKey) {
    setCategory(next)
    setValue(AWARDS[next].value)
  }

  async function download() {
    await document.fonts.load('400 100px Anton')
    const background = new Image()
    background.src = award.image
    await background.decode()
    const canvas = document.createElement("canvas")
    canvas.width = background.naturalWidth
    canvas.height = background.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(background, 0, 0)
    const nick = (name.trim() || "Jogador").toUpperCase().slice(0, 28)
    const achievement = (value.trim() || "0").toUpperCase().slice(0, 34)
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.lineJoin = "round"
    ctx.shadowColor = "rgba(0,0,0,.95)"
    ctx.shadowBlur = canvas.width * 0.007
    ctx.shadowOffsetY = canvas.width * 0.004
    ctx.strokeStyle = "rgba(0,0,0,.96)"
    ctx.lineWidth = canvas.width * 0.005
    const nickSize = canvas.width * 0.068
    fitText(ctx, nick, canvas.width * award.textWidth, nickSize)
    ctx.fillStyle = metallicGradient(ctx, canvas.height * award.nickY, nickSize, "#ffffff", "#9aa4b2", "#f8fafc")
    ctx.strokeText(nick, canvas.width * award.nickX, canvas.height * award.nickY)
    ctx.fillText(nick, canvas.width * award.nickX, canvas.height * award.nickY)
    const statSize = canvas.width * 0.046
    fitText(ctx, achievement, canvas.width * award.textWidth, statSize)
    ctx.fillStyle = metallicGradient(ctx, canvas.height * award.statY, statSize, award.highlight, "#ffffff", award.color)
    ctx.strokeText(achievement, canvas.width * award.statX, canvas.height * award.statY)
    ctx.fillText(achievement, canvas.width * award.statX, canvas.height * award.statY)
    if (tournamentUrl.trim()) {
      const qr = new Image()
      qr.src = await QRCode.toDataURL(tournamentUrl.trim(), { errorCorrectionLevel: "H", margin: 2, width: 384, color: { dark: award.color, light: "#080808" } })
      await qr.decode()
      const size = canvas.width * award.qrSize
      const x = canvas.width * award.qrX
      const y = canvas.height * award.qrY
      ctx.shadowBlur = 0
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
          <p className="absolute w-[52%] -translate-x-1/2 -translate-y-1/2 truncate bg-clip-text text-center text-[clamp(28px,4.5vw,40px)] leading-none tracking-[0.025em] text-transparent [font-family:'Anton',Impact,sans-serif] [-webkit-text-stroke:1px_rgba(0,0,0,.95)]" style={{ backgroundImage: "linear-gradient(180deg,#fff 0%,#aab2bd 44%,#fff 58%,#cbd5e1 100%)", filter: "drop-shadow(0 3px 2px #000)", left: `${award.nickX * 100}%`, top: `${award.nickY * 100}%` }}>{(name || "Jogador").toUpperCase()}</p>
          <p className="absolute w-[52%] truncate bg-clip-text text-center text-[clamp(18px,3vw,25px)] leading-none tracking-[0.02em] text-transparent [font-family:'Anton',Impact,sans-serif] [-webkit-text-stroke:1px_rgba(0,0,0,.95)]" style={{ backgroundImage: `linear-gradient(180deg,${award.highlight} 0%,#fff 45%,${award.color} 100%)`, filter: "drop-shadow(0 3px 2px #000)", left: `${award.statX * 100}%`, top: `${award.statY * 100}%`, transform: `translate(-50%,-50%) scale(${award.statScale})` }}>{value || "0"}</p>
          {qrPreview && <span className="absolute block aspect-square overflow-hidden" style={{ left: `${award.qrX * 100}%`, top: `${award.qrY * 100}%`, width: `${award.qrSize * 100}%` }}><img src={qrPreview} alt="QR Code do campeonato" className="h-full w-full" /></span>}
        </div>
      </div>
    </div>
  )
}
