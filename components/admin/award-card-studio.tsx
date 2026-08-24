"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"

const AWARDS = {
  artilheiro: { title: "ARTILHEIRO", defaultValue: "12 GOLS", image: "/images/awards/artilheiro-template.png", color: "#ffbd35" },
  garcom: { title: "GARÇOM", defaultValue: "9 ASSISTÊNCIAS", image: "/images/awards/garcom-template.png", color: "#38bdf8" },
  craque: { title: "CRAQUE DO CAMPEONATO", defaultValue: "NOTA 9,2", image: "/images/awards/craque-template.png", color: "#f4c542" },
  maestro: { title: "MAESTRO", defaultValue: "184 PASSES CERTOS", image: "/images/awards/maestro-template.png", color: "#2dd4bf" },
  xerife: { title: "XERIFE", defaultValue: "31 DESARMES", image: "/images/awards/xerife-template.png", color: "#e2e8f0" },
  muralha: { title: "MURALHA", defaultValue: "27 DEFESAS", image: "/images/awards/muralha-template.png", color: "#ef4444" },
} as const

type AwardKey = keyof typeof AWARDS

export function AwardCardStudio() {
  const [category, setCategory] = useState<AwardKey>("artilheiro")
  const [name, setName] = useState("Indio")
  const [team, setTeam] = useState("Bote Seu Pix")
  const [value, setValue] = useState(AWARDS.artilheiro.defaultValue)
  const [tournamentUrl, setTournamentUrl] = useState("")
  const [qrPreview, setQrPreview] = useState("")
  const award = AWARDS[category]

  useEffect(() => {
    if (!tournamentUrl.trim()) { setQrPreview(""); return }
    void QRCode.toDataURL(tournamentUrl.trim(), { margin: 1, width: 240, color: { dark: award.color, light: "#050505" } }).then(setQrPreview)
  }, [award.color, tournamentUrl])

  function changeCategory(next: AwardKey) {
    setCategory(next)
    setValue(AWARDS[next].defaultValue)
  }

  async function download() {
    const image = new Image()
    image.src = award.image
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(image, 0, 0)
    const center = canvas.width / 2
    const shadow = Math.max(4, canvas.width * 0.006)
    ctx.textAlign = "center"
    ctx.shadowColor = "#000"
    ctx.shadowBlur = shadow
    ctx.fillStyle = award.color
    ctx.font = `900 ${Math.round(canvas.width * (award.title.length > 18 ? 0.052 : 0.073))}px Impact, Arial Black, sans-serif`
    ctx.fillText(award.title, center, canvas.height * 0.665)
    ctx.fillStyle = "#fff"
    ctx.font = `900 ${Math.round(canvas.width * 0.067)}px Impact, Arial Black, sans-serif`
    ctx.fillText(name.trim() || "Jogador", center, canvas.height * 0.745)
    ctx.fillStyle = award.color
    ctx.font = `900 ${Math.round(canvas.width * 0.045)}px Impact, Arial Black, sans-serif`
    ctx.fillText(value.trim().toUpperCase() || "0", center, canvas.height * 0.805)
    ctx.fillStyle = "#aeb6c2"
    ctx.font = `600 ${Math.round(canvas.width * 0.025)}px Arial`
    ctx.fillText(team.trim() || "Sem time", center, canvas.height * 0.85)
    if (tournamentUrl.trim()) {
      const qr = new Image()
      qr.src = await QRCode.toDataURL(tournamentUrl.trim(), { margin: 1, width: 360, color: { dark: award.color, light: "#050505" } })
      await qr.decode()
      const qrSize = canvas.width * 0.13
      ctx.drawImage(qr, canvas.width * 0.77, canvas.height * 0.79, qrSize, qrSize)
    }
    const link = document.createElement("a")
    link.download = `${category}-${name || "jogador"}.png`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.-]+/gi, "-").toLowerCase()
    link.href = canvas.toDataURL("image/png", 1)
    link.click()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(AWARDS) as AwardKey[]).map((key) => (
            <button key={key} type="button" onClick={() => changeCategory(key)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${category === key ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/[0.025] text-gray-400 hover:text-white"}`}>
              {AWARDS[key].title}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-[11px] font-bold text-gray-400">Nome do jogador<input value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-amber-400" /></label>
          <label className="space-y-1 text-[11px] font-bold text-gray-400">Time<input value={team} onChange={(event) => setTeam(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-amber-400" /></label>
          <label className="space-y-1 text-[11px] font-bold text-gray-400 sm:col-span-2">Feito<input value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-amber-400" /></label>
          <label className="space-y-1 text-[11px] font-bold text-gray-400 sm:col-span-2">Link do campeonato para o QR Code<input value={tournamentUrl} onChange={(event) => setTournamentUrl(event.target.value)} placeholder="https://timbas.app/dashboard/tournaments/..." className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-amber-400" /></label>
        </div>
        <Button type="button" onClick={() => void download()} className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500"><Download className="h-4 w-4" />Baixar PNG em alta qualidade</Button>
        <p className="text-[10px] leading-relaxed text-gray-600">Os seis fundos são arquivos fixos. Esta ferramenta apenas desenha os dados por cima no navegador e não chama IA.</p>
      </div>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-xl bg-black shadow-2xl">
        {/* A imagem é decorativa; o texto acessível está nos controles do editor. */}
        <img src={award.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-[8%] top-[62%] text-center drop-shadow-[0_3px_3px_rgba(0,0,0,1)]">
          <p className={`font-black leading-none ${award.title.length > 18 ? "text-[clamp(13px,3vw,22px)]" : "text-[clamp(18px,4vw,30px)]"}`} style={{ color: award.color }}>{award.title}</p>
          <p className="mt-[7%] truncate text-[clamp(20px,5vw,36px)] font-black leading-none text-white">{name || "Jogador"}</p>
          <p className="mt-[5%] truncate text-[clamp(13px,3vw,22px)] font-black leading-none" style={{ color: award.color }}>{value || "0"}</p>
          <p className="mt-[4%] truncate text-[clamp(10px,2vw,14px)] font-semibold text-gray-300">{team || "Sem time"}</p>
        </div>
        {qrPreview && <img src={qrPreview} alt="QR Code do campeonato" className="absolute bottom-[8%] right-[9%] h-[13%] w-[13%] rounded-sm" />}
      </div>
    </div>
  )
}
