"use client"

import { useState } from "react"
import Image from "next/image"
import { AlertCircle, BarChart3, Brain, Crosshair, Eye, RefreshCw, Search, Shield, ShieldAlert, Skull, Swords, Trophy } from "lucide-react"
import { BetaBadge } from "@/components/ui/beta-badge"
import {
  formatRank,
  getChampionIconUrl,
  getRankBg,
  getRankColor,
  getRiotPlayerStats,
  PlayerProfileAnalysis,
  ScoutPlayer,
} from "@/lib/services/clash"

function ChampionIcon({ name, championId, size = 34 }: { name: string; championId?: number; size?: number }) {
  return (
    <div className="overflow-hidden rounded-full border border-white/10 bg-white/[0.04]" style={{ width: size, height: size }}>
      <Image src={getChampionIconUrl(name, championId)} alt={name} width={size} height={size} className="h-full w-full object-cover" unoptimized />
    </div>
  )
}

function ProfileIcon({ url, alt }: { url: string; alt: string }) {
  return <Image src={url.replace(/^http:\/\//, "https://")} alt={alt} width={64} height={64} className="rounded-2xl border border-white/10" unoptimized />
}

function RankBadge({ player }: { player: ScoutPlayer }) {
  const color = getRankColor(player.soloRank.tier)
  const bg = getRankBg(player.soloRank.tier)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-black ${bg} ${color}`}>
      <Trophy className="h-3 w-3" />
      {formatRank(player.soloRank)}
    </span>
  )
}

function QueueBlock({ title, queue }: { title: string; queue: ScoutPlayer["soloQueue"] }) {
  const style = queue.playstyle
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">{title}</p>
        <p className="text-sm font-black text-white">{queue.games}G</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-600">Winrate</p>
          <p className="font-black text-emerald-400">{queue.winrate}%</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-600">KDA</p>
          <p className="font-black text-white">{queue.avgKda}</p>
        </div>
      </div>
      {style && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[9px] uppercase tracking-widest text-gray-600">Mortes</p>
            <p className="font-black text-red-300">{style.avgDeaths}/jogo</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[9px] uppercase tracking-widest text-gray-600">KP</p>
            <p className="font-black text-sky-300">{style.avgKillParticipation}%</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[9px] uppercase tracking-widest text-gray-600">Dano</p>
            <p className="font-black text-white">{style.avgDamageToChampions}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[9px] uppercase tracking-widest text-gray-600">Visao</p>
            <p className="font-black text-emerald-300">{style.avgVisionScore}</p>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {queue.topChampions.slice(0, 6).map((champ) => (
          <div key={`${title}-${champ.championId}`} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#07070c] px-2 py-2">
            <ChampionIcon name={champ.championName} championId={champ.championId} size={28} />
            <div>
              <p className="text-xs font-bold text-white">{champ.championName}</p>
              <p className="text-[10px] text-gray-500">{champ.games}G • {champ.winrate}% WR</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StyleAnalysisCard({ analysis, player }: { analysis?: PlayerProfileAnalysis; player: ScoutPlayer }) {
  const solo = player.soloQueue.playstyle
  const flex = player.flexQueue.playstyle
  const clash = player.clashHistory.playstyle
  const bestStyle = player.soloQueue.games >= player.flexQueue.games ? solo : flex
  const map = player.mapProfile
  const lanePressure = map?.likelyGankFocus ?? "inconclusivo"
  const fightRegion = map?.mostFought ?? "inconclusivo"
  const deathRegion = map?.mostDeaths ?? "inconclusivo"

  return (
    <div className="rounded-2xl border border-sky-500/15 bg-[#07070c]/70 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-sky-400" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Analise de estilo</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center gap-2 text-red-300">
            <Skull className="h-3.5 w-3.5" />
            <p className="text-[10px] font-black uppercase tracking-widest">Risco</p>
          </div>
          <p className="text-lg font-black text-white">{bestStyle?.avgDeaths ?? 0}</p>
          <p className="text-[11px] text-gray-500">mortes por jogo</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center gap-2 text-sky-300">
            <Crosshair className="h-3.5 w-3.5" />
            <p className="text-[10px] font-black uppercase tracking-widest">Fights</p>
          </div>
          <p className="text-lg font-black text-white">{bestStyle?.avgKillParticipation ?? 0}%</p>
          <p className="text-[11px] text-gray-500">kill participation</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center gap-2 text-emerald-300">
            <Eye className="h-3.5 w-3.5" />
            <p className="text-[10px] font-black uppercase tracking-widest">Mapa</p>
          </div>
          <p className="text-lg font-black text-white">{bestStyle?.avgVisionScore ?? 0}</p>
          <p className="text-[11px] text-gray-500">visao por jogo</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <Swords className="h-3.5 w-3.5" />
            <p className="text-[10px] font-black uppercase tracking-widest">Objetivos</p>
          </div>
          <p className="text-lg font-black text-white">{bestStyle?.avgTeamDragons ?? clash?.avgTeamDragons ?? 0}</p>
          <p className="text-[11px] text-gray-500">dragoes do time/jogo</p>
        </div>
      </div>

      {map && map.games > 0 && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">Mapa por timeline ({map.games} jogos)</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-gray-600">Pressao/gank</p>
              <p className="text-sm font-black text-white">{lanePressure}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-gray-600">Onde luta</p>
              <p className="text-sm font-black text-white">{fightRegion}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-gray-600">Onde morre</p>
              <p className="text-sm font-black text-white">{deathRegion}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-gray-600">Invade/obj</p>
              <p className="text-sm font-black text-white">{map.invades} invade • {map.objectiveFights} obj</p>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">Resumo</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">{analysis.summary}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">Mapa e objetivos</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">{analysis.objectivePattern}</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">{analysis.mapPattern}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">Fights e risco</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">{analysis.fightPattern}</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">{analysis.riskPattern}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">Como jogar contra</p>
            <div className="mt-2 space-y-2">
              {analysis.tips.map((tip, index) => (
                <p key={index} className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-gray-300">{tip}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getBanReason(champ: ScoutPlayer["combinedTopChamps"][number]) {
  if (champ.winrate >= 60 && champ.games >= 4) return "Winrate alto no historico recente"
  if (champ.kda >= 4 && champ.games >= 3) return "KDA acima da media"
  if (champ.games >= 8) return "Muito volume nas ultimas partidas"
  return "Prioridade por desempenho combinado"
}

function BanSuggestionCard({ champ, index }: { champ: ScoutPlayer["combinedTopChamps"][number]; index: number }) {
  return (
    <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.035] p-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <ChampionIcon name={champ.championName} championId={champ.championId} size={42} />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-red-400/30 bg-[#07070c] text-[10px] font-black text-red-300">
            {index + 1}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{champ.championName}</p>
          <p className="text-[11px] font-bold text-red-200">{champ.games}G . {champ.winrate}% WR . {champ.kda} KDA</p>
        </div>
      </div>
      <p className="mt-3 min-h-8 text-xs font-semibold leading-4 text-gray-400">{getBanReason(champ)}</p>
    </div>
  )
}

export default function LolProfileClient({ token }: { token: string }) {
  const [input, setInput] = useState("")
  const [player, setPlayer] = useState<ScoutPlayer | null>(null)
  const [analysis, setAnalysis] = useState<PlayerProfileAnalysis | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    const trimmed = input.trim()
    const sep = trimmed.lastIndexOf("#")
    if (sep <= 0 || sep === trimmed.length - 1) {
      setError("Formato inválido. Use Nome#TAG")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getRiotPlayerStats(token, trimmed.slice(0, sep), trimmed.slice(sep + 1))
      setPlayer(data.player)
      setAnalysis(data.analysis)
    } catch (e: any) {
      setError(e.message ?? "Falha ao buscar jogador")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-view space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
            <BarChart3 className="h-5 w-5 text-sky-400" />
          </div>
          <h1 className="text-3xl font-black text-white">Perfil LoL</h1>
          <BetaBadge className="text-[10px] px-2" />
        </div>
        <p className="ml-[52px] mt-1 text-sm text-gray-500">Busque estatísticas recentes de qualquer Riot ID</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#07070c]/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && search()}
              placeholder="NomeDoJogador#BR1"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-sky-500/50 focus:outline-none"
            />
          </div>
          <button
            onClick={search}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-black text-black transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {player && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/[0.08] to-transparent p-5">
            <div className="flex flex-wrap items-center gap-4">
              <ProfileIcon url={player.profileIconUrl} alt={player.riotId} />
              <div className="flex-1">
                <p className="text-2xl font-black text-white">{player.riotId}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(player.topPositions ?? [player.position]).map((pos) => (
                    <span key={pos} className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-black text-sky-300">{pos}</span>
                  ))}
                </div>
              </div>
              <RankBadge player={player} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <QueueBlock title="SoloQ recente" queue={player.soloQueue} />
            <QueueBlock title="Flex recente" queue={player.flexQueue} />
            <QueueBlock title="Clash recente" queue={player.clashHistory} />
          </div>

          <StyleAnalysisCard player={player} analysis={analysis} />

          {player.combinedTopChamps.length > 0 && (
            <div className="rounded-2xl border border-red-500/10 bg-[#07070c]/70 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Possiveis bans</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {player.combinedTopChamps.slice(0, 5).map((champ, index) => (
                  <BanSuggestionCard key={`ban-${champ.championId}`} champ={champ} index={index} />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Swords className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Campeões combinados</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {player.combinedTopChamps.slice(0, 10).map((champ) => <ChampionIcon key={champ.championId} name={champ.championName} championId={champ.championId} />)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Maestria</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {player.masteryTop10.slice(0, 10).map((champ) => <ChampionIcon key={champ.championId} name={champ.championName} championId={champ.championId} />)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
