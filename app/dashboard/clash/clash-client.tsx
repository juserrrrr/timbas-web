"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ShieldAlert, Trophy, Swords, Target, Brain,
  AlertCircle, Shield, RefreshCw, Search, Zap,
} from "lucide-react"
import {
  scout as fetchScout,
  ScoutResult, ScoutPlayer, BanSuggestion, CounterplayAdvice, PredictedPick,
  QueueChampStat, getChampionIconUrl, getRankColor, getRankBg, formatRank, RankInfo,
} from "@/lib/services/clash"

const POSITION_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Suporte", FILL: "Fill",
}
const POSITION_COLORS: Record<string, string> = {
  TOP:     "text-orange-400 border-orange-500/30 bg-orange-500/10",
  JUNGLE:  "text-green-400  border-green-500/30  bg-green-500/10",
  MID:     "text-blue-400   border-blue-500/30   bg-blue-500/10",
  ADC:     "text-red-400    border-red-500/30    bg-red-500/10",
  SUPPORT: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  FILL:    "text-gray-400   border-gray-500/30   bg-gray-500/10",
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function ChampionIcon({ name, size = 32 }: { name: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (err || !name) {
    return (
      <div
        className="rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Swords className="text-gray-600" style={{ width: size * 0.4, height: size * 0.4 }} />
      </div>
    )
  }
  return (
    <div
      className="rounded-full overflow-hidden border-2 border-amber-500/30 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={getChampionIconUrl(name)}
        alt={name}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        onError={() => setErr(true)}
        unoptimized
      />
    </div>
  )
}

function SummonerIcon({ url, size = 40 }: { url: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (err || !url) {
    return (
      <div
        className="rounded-full bg-white/5 border-2 border-amber-500/30 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Shield className="text-amber-500/40" style={{ width: size * 0.4, height: size * 0.4 }} />
      </div>
    )
  }
  return (
    <div
      className="rounded-full overflow-hidden border-2 border-amber-500/30 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Image src={url} alt="icon" width={size} height={size} className="object-cover w-full h-full" onError={() => setErr(true)} unoptimized />
    </div>
  )
}

function WinrateBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 55 ? "bg-emerald-500" : value >= 50 ? "bg-blue-500" : value >= 45 ? "bg-amber-500" : "bg-red-500"
  const textColor = value >= 55 ? "text-emerald-400" : value >= 50 ? "text-blue-400" : value >= 45 ? "text-amber-400" : "text-red-400"
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-600">{label ?? "Winrate"}</span>
        <span className={`font-bold tabular-nums ${textColor}`}>{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

function RankBadge({ rank, compact = false }: { rank: RankInfo; compact?: boolean }) {
  const color = getRankColor(rank?.tier)
  const bg = getRankBg(rank?.tier)
  if (compact) {
    return (
      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${bg} ${color}`}>
        {formatRank(rank)}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${bg} ${color}`}>
      <Trophy className="h-2.5 w-2.5" />
      {formatRank(rank)}
    </span>
  )
}

function ChampionTip({ champ, size = 26 }: { champ: QueueChampStat; size?: number }) {
  return (
    <div className="group/tip relative">
      <ChampionIcon name={champ.championName} size={size} />
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
        <div className="rounded-lg border border-white/10 bg-[#0d0d14]/95 px-2.5 py-1.5 text-center shadow-2xl backdrop-blur whitespace-nowrap">
          <p className="text-xs font-bold text-white">{champ.championName}</p>
          <p className="text-[10px] text-gray-400">{champ.games}G • {champ.winrate}% WR • {champ.kda} KDA</p>
        </div>
      </div>
    </div>
  )
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, index, counterplay, predictedPick }: {
  player: ScoutPlayer
  index: number
  counterplay?: CounterplayAdvice
  predictedPick?: PredictedPick
}) {
  const posColor = POSITION_COLORS[player.position] ?? POSITION_COLORS.FILL
  const [name, tag] = player.riotId.split("#")

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629] to-[#0a0e1a] p-4 hover:border-amber-500/20 transition-colors duration-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${posColor}`}>
          {POSITION_LABELS[player.position] ?? player.position}
        </span>
        {player.clashHistory.games > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
            <Swords className="h-2 w-2" />
            CLASH
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <SummonerIcon url={player.profileIconUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-amber-300 leading-none">{name}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">#{tag}</p>
        </div>
      </div>

      {/* Solo rank */}
      <div className="space-y-1">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Solo/Duo</p>
        <RankBadge rank={player.soloRank} />
        {player.soloRank.wins !== undefined && (
          <p className="text-[10px] text-gray-600">
            {player.soloRank.wins}W / {player.soloRank.losses}L
            <span className={`ml-1.5 font-bold ${player.soloSeasonWinrate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {player.soloSeasonWinrate}%
            </span>
          </p>
        )}
      </div>

      {/* Recent solo */}
      {player.soloQueue.games > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">
            Últimas {player.soloQueue.games} solos
          </p>
          <WinrateBar value={player.soloQueue.winrate} />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-600">KDA médio</span>
            <span className="font-mono text-[11px] font-bold text-white">{player.soloQueue.avgKda}</span>
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {player.soloQueue.topChampions.slice(0, 4).map((c) => (
              <ChampionTip key={c.championId} champ={c} size={24} />
            ))}
          </div>
        </div>
      )}

      {/* Flex */}
      {player.flexQueue.games > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Flex</p>
          <RankBadge rank={player.flexRank} compact />
          <p className="text-[10px] text-gray-600">
            {player.flexQueue.games}G •{" "}
            <span className={player.flexQueue.winrate >= 50 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              {player.flexQueue.winrate}%
            </span>
            {" "}• {player.flexQueue.avgKda} KDA
          </p>
        </div>
      )}

      {/* Combined top picks */}
      {player.combinedTopChamps.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Mais Jogados</p>
          <div className="flex flex-wrap gap-1">
            {player.combinedTopChamps.slice(0, 5).map((c) => (
              <ChampionTip key={c.championId} champ={c} size={26} />
            ))}
          </div>
        </div>
      )}

      {/* Mastery */}
      {player.masteryTop10.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Maestria</p>
          <div className="flex flex-wrap gap-1">
            {player.masteryTop10.slice(0, 5).map((m) => (
              <div key={m.championId} className="group/tip relative">
                <ChampionIcon name={m.championName} size={24} />
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
                  <div className="rounded-lg border border-white/10 bg-[#0d0d14]/95 px-2.5 py-1.5 text-center shadow-2xl backdrop-blur whitespace-nowrap">
                    <p className="text-xs font-bold text-white">{m.championName}</p>
                    <p className="text-[10px] text-amber-400">M{m.masteryLevel} • {m.masteryPoints.toLocaleString()} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clash history */}
      {player.clashHistory.games > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-700 mb-1.5">
            Clash ({player.clashHistory.games}G • {player.clashHistory.winrate}% WR)
          </p>
          <div className="flex flex-wrap gap-1">
            {player.clashHistory.topChampions.slice(0, 3).map((c) => (
              <ChampionTip key={c.championId} champ={c} size={24} />
            ))}
          </div>
        </div>
      )}

      {/* AI: likely pick */}
      {counterplay && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-2.5 space-y-1.5 mt-auto">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-red-400 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-wider text-red-400">Provável Pick</p>
          </div>
          <div className="flex items-center gap-2">
            <ChampionIcon name={counterplay.likelyPick} size={28} />
            <p className="text-xs font-bold text-white">{counterplay.likelyPick}</p>
          </div>
          <p className="text-[10px] text-gray-400 leading-snug">{counterplay.howToCounter}</p>
          {counterplay.keyThreats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {counterplay.keyThreats.map((t) => (
                <span key={t} className="rounded-md bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI: predicted picks if banned */}
      {predictedPick && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-purple-400 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-wider text-purple-400">Se Banado, Pode Pegar</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[predictedPick.option1, predictedPick.option2].map((opt) => (
              <div key={opt.champion} className="flex items-center gap-1.5">
                <ChampionIcon name={opt.champion} size={22} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-white leading-none">{opt.champion}</p>
                  <p className="text-[9px] text-gray-500 leading-snug line-clamp-2">{opt.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Ban card ─────────────────────────────────────────────────────────────────

function BanCard({ ban }: { ban: BanSuggestion }) {
  const colors = [
    "",
    "text-red-400 border-red-500/40 bg-red-500/10",
    "text-orange-400 border-orange-500/40 bg-orange-500/10",
    "text-amber-400 border-amber-500/40 bg-amber-500/10",
    "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
    "text-gray-400 border-gray-500/40 bg-gray-500/10",
  ]
  const p = ban.priority
  return (
    <div className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all hover:scale-[1.02] ${colors[p]}`}>
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black ${colors[p]}`}>
        {p}
      </div>
      <ChampionIcon name={ban.championName} size={48} />
      <div className="text-center">
        <p className="text-xs font-black text-white">{ban.championName}</p>
        <p className="text-[10px] text-gray-500">→ {ban.targetPlayer.split("#")[0]}</p>
      </div>
      <p className="text-center text-[10px] text-gray-400 leading-tight line-clamp-2">{ban.reason}</p>
    </div>
  )
}

function ScoutSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[440px] rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-white/[0.03]" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClashScoutClient({ token }: { token: string }) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ScoutResult | null>(null)

  const handleScout = async () => {
    const trimmed = input.trim()
    const sep = trimmed.lastIndexOf("#")
    if (sep <= 0 || sep === trimmed.length - 1) {
      setError("Formato inválido. Use: NomeDoJogador#TAG")
      return
    }
    const gameName = trimmed.slice(0, sep)
    const tagLine = trimmed.slice(sep + 1)
    setLoading(true)
    setError(null)
    setData(null)
    try {
      setData(await fetchScout(token, gameName, tagLine))
    } catch (e: any) {
      setError(e.message ?? "Erro ao buscar dados")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Clash <span className="text-amber-400">Scout</span>
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-11">
          Digite o nick de qualquer jogador — veja o time, stats e análise de IA
        </p>
      </div>

      {/* Search form */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629] to-[#0a0e1a] p-5 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleScout()}
            placeholder="NomeDoJogador#BR1"
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-amber-500/40 focus:outline-none transition-colors"
          />
          <button
            onClick={handleScout}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-black transition-all hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Buscando..." : "Scout"}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm text-amber-400 font-semibold animate-pulse">
              Buscando dados do time — isso pode levar alguns segundos...
            </p>
          </div>
          <ScoutSkeleton />
        </div>
      )}

      {/* Results */}
      {!loading && data && (
        <div className="space-y-6">

          {/* Team header */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.04] to-transparent p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Swords className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 mb-0.5">Time de Clash</p>
                <p className="text-xl font-black text-white">{data.team.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Sigla</p>
                <p className="font-black text-white">{data.team.abbreviation}</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center">
                <p className="text-[10px] text-amber-700 uppercase tracking-wider">Tier</p>
                <p className="font-black text-amber-400">{data.team.tier || "—"}</p>
              </div>
            </div>
          </div>

          {/* Player grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {data.players.map((player, i) => (
              <PlayerCard
                key={player.riotId}
                player={player}
                index={i}
                counterplay={data.counterplays.find((c) => c.riotId === player.riotId)}
                predictedPick={data.predictedPicks.find((p) => p.riotId === player.riotId)}
              />
            ))}
          </div>

          {/* AI analysis */}
          {(data.bans.length > 0 || data.strategy) && (
            <div className="rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/[0.04] to-transparent p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                  <Brain className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="font-black text-white">Análise de IA</p>
                  <p className="text-xs text-gray-500">Bans recomendados e perfil tático do time</p>
                </div>
              </div>

              {data.strategy && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start gap-3">
                    <Target className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Perfil do Time</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{data.strategy}</p>
                    </div>
                  </div>
                </div>
              )}

              {data.bans.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Bans Sugeridos</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[...data.bans].sort((a, b) => a.priority - b.priority).map((ban) => (
                      <BanCard key={ban.championName} ban={ban} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.bans.length === 0 && !data.strategy && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <Brain className="h-4 w-4 text-gray-600" />
              <p className="text-sm text-gray-500">Análise de IA indisponível. Configure ANTHROPIC_API_KEY no backend.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
