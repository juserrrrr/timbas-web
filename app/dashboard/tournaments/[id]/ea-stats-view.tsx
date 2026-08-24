"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BarChart3, Crosshair, Download, Goal, Hand, Loader2, Medal, Shield, Sparkles } from "lucide-react"
import "@fontsource/anton"
import "@fontsource/tourney/600.css"
import "@fontsource/cinzel-decorative/700.css"
import "@fontsource/black-ops-one"
import "@fontsource/graduate"
import "@fontsource/teko/600.css"
import { Card } from "@/components/ui/card"
import { EmptyState, TeamCrest } from "@/components/competitions/shared"
import { getTournamentEaAwards } from "@/lib/services/tournaments"
import type { TournamentEaAward, TournamentEaPlayerStats } from "@/lib/services/tournaments.types"
import { awardCardByTitle, type AwardCardLayoutSettings } from "@/lib/award-card-config"
import { renderAwardCard } from "@/lib/award-card-render"
import { getAwardCardSettings } from "@/lib/services/award-cards"
import { publicTournamentUrl } from "@/lib/public-site-url"

const TAGS: Record<string, string> = {
  MVP: "MVP",
  HAT_TRICK: "Hat-trick",
  DOIS_GOLS: "Doblete",
  MAESTRO: "Maestro",
  PAREDAO: "Paredão",
  NOTA_9_PLUS: "Nota 9+",
}

async function downloadAwardPng(title: string, subtitle: string, player: TournamentEaPlayerStats, value: string, tournamentId: string, settings: AwardCardLayoutSettings) {
  const template = awardCardByTitle(title, settings)
  if (template) {
    const output = document.createElement("canvas")
    await renderAwardCard(output, template, player.playerName, value, publicTournamentUrl(tournamentId))
    const download = document.createElement("a")
    download.download = `${title}-${player.playerName}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".png"
    download.href = output.toDataURL("image/png", 1)
    download.click()
    return
  }
  const canvas = document.createElement("canvas")
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const themes: Record<string, { colors: [string, string, string]; accent: string; detail: string; motif: string }> = {
    Artilheiro: { colors: ["#241300", "#080503", "#421600"], accent: "#ff9d00", detail: "#ffd166", motif: "target" },
    "Garçom": { colors: ["#001d3d", "#020617", "#003566"], accent: "#38bdf8", detail: "#a5f3fc", motif: "diamond" },
    "Craque do Campeonato": { colors: ["#240046", "#07020d", "#5a189a"], accent: "#c77dff", detail: "#f0abfc", motif: "rays" },
    Maestro: { colors: ["#002b1d", "#020806", "#005f45"], accent: "#34d399", detail: "#a7f3d0", motif: "pitch" },
    Xerife: { colors: ["#172033", "#05070b", "#334155"], accent: "#cbd5e1", detail: "#ffffff", motif: "shield" },
    Muralha: { colors: ["#3b0712", "#090205", "#7f1d1d"], accent: "#fb7185", detail: "#fecdd3", motif: "net" },
  }
  const theme = themes[title] ?? themes.Artilheiro
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, theme.colors[0])
  gradient.addColorStop(0.55, theme.colors[1])
  gradient.addColorStop(1, theme.colors[2])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1350)
  ctx.save()
  ctx.globalAlpha = 0.13
  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 9
  if (theme.motif === "target") {
    for (const radius of [260, 330, 400]) { ctx.beginPath(); ctx.arc(540, 620, radius, 0, Math.PI * 2); ctx.stroke() }
  } else if (theme.motif === "diamond") {
    for (const size of [390, 520, 650]) { ctx.save(); ctx.translate(540, 620); ctx.rotate(Math.PI / 4); ctx.strokeRect(-size / 2, -size / 2, size, size); ctx.restore() }
  } else if (theme.motif === "rays") {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) { ctx.beginPath(); ctx.moveTo(540, 620); ctx.lineTo(540 + Math.cos(angle) * 780, 620 + Math.sin(angle) * 780); ctx.stroke() }
  } else if (theme.motif === "pitch") {
    ctx.strokeRect(145, 355, 790, 535); ctx.beginPath(); ctx.arc(540, 622, 115, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(540, 355); ctx.lineTo(540, 890); ctx.stroke()
  } else if (theme.motif === "shield") {
    ctx.beginPath(); ctx.moveTo(540, 300); ctx.lineTo(850, 420); ctx.lineTo(790, 790); ctx.lineTo(540, 940); ctx.lineTo(290, 790); ctx.lineTo(230, 420); ctx.closePath(); ctx.stroke()
  } else {
    ctx.strokeRect(180, 350, 720, 540); for (let x = 220; x < 900; x += 85) { ctx.beginPath(); ctx.moveTo(x, 350); ctx.lineTo(x, 890); ctx.stroke() }; for (let y = 400; y < 890; y += 70) { ctx.beginPath(); ctx.moveTo(180, y); ctx.lineTo(900, y); ctx.stroke() }
  }
  ctx.restore()
  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 8
  ctx.strokeRect(42, 42, 996, 1266)
  ctx.strokeStyle = theme.detail
  ctx.lineWidth = 3
  ctx.strokeRect(66, 66, 948, 1218)
  ctx.textAlign = "center"
  ctx.fillStyle = theme.detail
  ctx.font = "700 30px Arial"
  ctx.fillText("TIMBAS · DESTAQUES INDIVIDUAIS", 540, 145)
  ctx.fillStyle = "#ffffff"
  ctx.font = "900 86px Arial"
  ctx.fillText(title.toUpperCase(), 540, 275)
  ctx.fillStyle = theme.detail
  ctx.font = "600 32px Arial"
  ctx.fillText(subtitle, 540, 335)
  ctx.fillStyle = theme.colors[0]
  ctx.beginPath()
  ctx.arc(540, 610, 210, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.fillStyle = theme.accent
  ctx.font = "900 190px Arial"
  ctx.fillText(player.playerName.slice(0, 1).toUpperCase(), 540, 675)
  ctx.fillStyle = "#ffffff"
  ctx.font = "900 62px Arial"
  ctx.fillText(player.playerName, 540, 920)
  ctx.fillStyle = "#94a3b8"
  ctx.font = "500 30px Arial"
  ctx.fillText(player.team?.name ?? "Sem time", 540, 975)
  ctx.fillStyle = theme.accent
  ctx.font = "900 72px Arial"
  ctx.fillText(value, 540, 1115)
  ctx.fillStyle = "#64748b"
  ctx.font = "600 24px Arial"
  ctx.fillText("DADOS OFICIAIS SINCRONIZADOS DO EA SPORTS FC CLUBS", 540, 1235)
  const link = document.createElement("a")
  link.download = `${title}-${player.playerName}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".png"
  link.href = canvas.toDataURL("image/png")
  link.click()
}

type TournamentAward = TournamentEaAward & {
  icon: typeof Goal
  tone: string
}

const AWARD_PRESENTATION: Record<TournamentEaAward["key"], Pick<TournamentAward, "icon" | "tone">> = {
  ARTILHEIRO: { icon: Goal, tone: "from-amber-500/25 to-orange-500/[0.04] border-amber-500/30 text-amber-300" },
  GARCOM: { icon: Sparkles, tone: "from-blue-500/25 to-cyan-500/[0.04] border-blue-500/30 text-blue-300" },
  CRAQUE: { icon: Medal, tone: "from-violet-500/25 to-fuchsia-500/[0.04] border-violet-500/30 text-violet-300" },
  MAESTRO: { icon: Crosshair, tone: "from-emerald-500/25 to-teal-500/[0.04] border-emerald-500/30 text-emerald-300" },
  XERIFE: { icon: Shield, tone: "from-slate-400/20 to-slate-500/[0.03] border-slate-400/25 text-slate-300" },
  MURALHA: { icon: Hand, tone: "from-rose-500/20 to-red-500/[0.03] border-rose-500/25 text-rose-300" },
}

function AwardCardPreview({ award, tournamentId, settings, index }: { award: TournamentAward; tournamentId: string; settings: AwardCardLayoutSettings; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendering, setRendering] = useState(true)
  const [renderError, setRenderError] = useState(false)
  const achievement = award.value
  const playerName = award.player.playerName
  const awardTitle = award.title

  useEffect(() => {
    const template = awardCardByTitle(awardTitle, settings)
    const canvas = canvasRef.current
    if (!template || !canvas) {
      setRendering(false)
      setRenderError(true)
      return
    }
    let active = true
    setRendering(true)
    setRenderError(false)
    void renderAwardCard(canvas, template, playerName, achievement, publicTournamentUrl(tournamentId))
      .then(() => active && setRendering(false))
      .catch(() => {
        if (active) {
          setRendering(false)
          setRenderError(true)
        }
      })
    return () => { active = false }
  }, [achievement, awardTitle, playerName, settings, tournamentId])

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 5) * 90}ms` }}
      className="award-card-enter group relative overflow-hidden rounded-[26px] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:ring-amber-400/30"
    >
      <canvas ref={canvasRef} className={`block aspect-[4/5] w-full object-cover transition-opacity duration-500 ${rendering || renderError ? "opacity-20" : "opacity-100"}`} aria-label={`${award.title}: ${award.player.playerName}`} />
      {rendering && <span className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-300" /></span>}
      {renderError && <span className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-bold text-red-300">NÃ£o foi possÃ­vel carregar a arte deste card.</span>}
      <button
        type="button"
        onClick={() => void downloadAwardPng(award.title, award.subtitle, award.player, achievement, tournamentId, settings)}
        className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-black/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-lg backdrop-blur transition hover:border-amber-400/60 hover:text-amber-300"
      >
        <Download className="h-3.5 w-3.5" /> Baixar PNG
      </button>
    </article>
  )
}

export function EaStatsView({ tournamentId, finished = false }: { tournamentId: string; finished?: boolean }) {
  const [players, setPlayers] = useState<TournamentEaPlayerStats[]>([])
  const [officialAwards, setOfficialAwards] = useState<TournamentEaAward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [awardSettings, setAwardSettings] = useState<AwardCardLayoutSettings>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [awardResult, settings] = await Promise.all([
        getTournamentEaAwards(tournamentId),
        getAwardCardSettings().catch(() => ({})),
      ])
      setPlayers(Array.isArray(awardResult.players) ? awardResult.players : [])
      setOfficialAwards(awardResult.awards)
      setAwardSettings(settings)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as estatísticas da EA.")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  if (error) return <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">{error}</p>
  if (!players.length) {
    return <EmptyState icon={BarChart3} title="Nenhuma estatística sincronizada" description="Depois que alguém checar uma partida na EA, gols, assistências, notas e destaques aparecem aqui." />
  }

  const awards: TournamentAward[] = finished
    ? officialAwards.map((award) => ({ ...award, ...AWARD_PRESENTATION[award.key] }))
    : []

  return (
    <div className="space-y-4">
      {awards.length > 0 && <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-4"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Premiação oficial</p><h3 className="mt-1 text-xl font-black text-white">Seleção do campeonato</h3><p className="mt-1 text-[11px] text-gray-400">Cada carta usa todas as partidas e estatísticas sincronizadas durante o campeonato inteiro, não somente a final.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{awards.map((award, index) => <AwardCardPreview key={award.title} award={award} tournamentId={tournamentId} settings={awardSettings} index={index} />)}</div></section>}
    <Card className="overflow-hidden border-white/[0.07] bg-white/[0.025]">
      <div className="border-b border-white/[0.06] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-white"><Medal className="h-4 w-4 text-amber-400" />Estatísticas do campeonato</h3>
        <p className="mt-1 text-[11px] text-gray-500">Dados sincronizados dos amistosos no EA Sports FC Clubs.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-gray-600">
            <tr><th className="px-4 py-3">Jogador</th><th className="px-3 py-3">J</th><th className="px-3 py-3">G</th><th className="px-3 py-3">A</th><th className="px-3 py-3">G+A</th><th className="px-3 py-3">Nota</th><th className="px-3 py-3">MVP</th><th className="px-4 py-3">Destaques</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {players.map((player, index) => (
              <tr key={`${player.team?.id}:${player.externalPlayerId ?? player.playerName}`} className="text-gray-300">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="w-5 text-center font-black text-gray-600">{index + 1}</span><TeamCrest name={player.team?.name} logoUrl={player.team?.logoUrl} size={28} /><div><p className="font-bold text-white">{player.playerName}</p><p className="text-[10px] text-gray-600">{player.team?.name ?? "-"}</p></div></div></td>
                <td className="px-3 py-3">{player.appearances}</td><td className="px-3 py-3 font-black text-emerald-300">{player.goals}</td><td className="px-3 py-3 text-blue-300">{player.assists}</td><td className="px-3 py-3 font-bold text-white">{player.goalContributions}</td><td className="px-3 py-3">{player.averageRating?.toFixed(1) ?? "-"}</td><td className="px-3 py-3">{player.mvps}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(player.tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">{TAGS[tag] ?? tag}</span>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card></div>
  )
}
