"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ShieldAlert, Trophy, Swords, Target, Brain,
  AlertCircle, Shield, RefreshCw, Search, Zap, Star,
  TrendingUp, Flame, Crown,
} from "lucide-react"
import {
  scout as fetchScout,
  ScoutResult, ScoutPlayer, BanSuggestion, CounterplayAdvice, PredictedPick,
  QueueChampStat, getChampionIconUrl, getRankColor, getRankBg, formatRank, RankInfo,
} from "@/lib/services/clash"

const POSITION_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Support", FILL: "Fill",
}

const POSITION_COLORS: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  TOP:     { text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", glow: "shadow-orange-500/20" },
  JUNGLE:  { text: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10",  glow: "shadow-green-500/20"  },
  MID:     { text: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10",   glow: "shadow-blue-500/20"   },
  ADC:     { text: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/10",    glow: "shadow-red-500/20"    },
  SUPPORT: { text: "text-purple-400", border: "border-purple-500/40", bg: "bg-purple-500/10", glow: "shadow-purple-500/20" },
  FILL:    { text: "text-gray-400",   border: "border-gray-500/40",   bg: "bg-gray-500/10",   glow: "shadow-gray-500/20"   },
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function ChampionIcon({ name, size = 32, ring }: { name: string; size?: number; ring?: string }) {
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
      className={`rounded-full overflow-hidden border-2 flex-shrink-0 ${ring ?? "border-amber-500/30"}`}
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

function SummonerIcon({ url, size = 48, posColor }: { url: string; size?: number; posColor?: string }) {
  const [err, setErr] = useState(false)
  const border = posColor ?? "border-amber-500/50"
  if (err || !url) {
    return (
      <div
        className={`rounded-full bg-white/5 border-2 ${border} flex items-center justify-center flex-shrink-0`}
        style={{ width: size, height: size }}
      >
        <Shield className="text-amber-500/40" style={{ width: size * 0.4, height: size * 0.4 }} />
      </div>
    )
  }
  return (
    <div
      className={`rounded-full overflow-hidden border-2 ${border} flex-shrink-0 shadow-lg`}
      style={{ width: size, height: size }}
    >
      <Image src={url} alt="icon" width={size} height={size} className="object-cover w-full h-full" onError={() => setErr(true)} unoptimized />
    </div>
  )
}

function WinrateBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 55 ? "from-emerald-500 to-emerald-400" : value >= 50 ? "from-blue-500 to-blue-400" : value >= 45 ? "from-amber-500 to-amber-400" : "from-red-500 to-red-400"
  const textColor = value >= 55 ? "text-emerald-400" : value >= 50 ? "text-blue-400" : value >= 45 ? "text-amber-400" : "text-red-400"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-500">{label ?? "Winrate"}</span>
        <span className={`font-black tabular-nums ${textColor}`}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

function RankBadge({ rank, compact = false }: { rank: RankInfo; compact?: boolean }) {
  const color = getRankColor(rank?.tier)
  const bg = getRankBg(rank?.tier)
  if (compact) {
    return (
      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${bg} ${color}`}>
        {formatRank(rank)}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold ${bg} ${color}`}>
      <Trophy className="h-3 w-3" />
      {formatRank(rank)}
    </span>
  )
}

function ChampionTip({ champ, size = 28 }: { champ: QueueChampStat; size?: number }) {
  const wr = champ.winrate
  const wrColor = wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-blue-400" : "text-red-400"
  return (
    <div className="group/tip relative">
      <div className="transition-transform duration-150 group-hover/tip:scale-110">
        <ChampionIcon name={champ.championName} size={size} />
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover/tip:opacity-100 transition-all duration-200 scale-95 group-hover/tip:scale-100">
        <div className="rounded-xl border border-white/10 bg-[#0a0a12]/98 px-3 py-2 text-center shadow-2xl backdrop-blur-xl whitespace-nowrap">
          <p className="text-xs font-black text-white">{champ.championName}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {champ.games}G •{" "}
            <span className={`font-bold ${wrColor}`}>{champ.winrate}% WR</span>
            {" "}• {champ.kda} KDA
          </p>
        </div>
        <div className="w-2 h-2 bg-[#0a0a12]/98 border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className={`font-mono text-[11px] font-bold tabular-nums ${highlight ? "text-amber-400" : "text-white"}`}>{value}</span>
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
  const pos = POSITION_COLORS[player.position] ?? POSITION_COLORS.FILL
  const [name, tag] = player.riotId.split("#")

  return (
    <div
      className={`group flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#07070c]/80 p-4 shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-2xl ${pos.glow}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Position badge + clash tag */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${pos.text} ${pos.border} ${pos.bg}`}>
          {POSITION_LABELS[player.position] ?? player.position}
        </span>
        {player.clashHistory.games > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-400 uppercase tracking-wider">
            <Swords className="h-2.5 w-2.5" />
            Clash
          </span>
        )}
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <SummonerIcon url={player.profileIconUrl} size={44} posColor={pos.border} />
          <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border border-[#07070c] ${pos.bg} ${pos.border} border flex items-center justify-center`}>
            <div className={`h-1.5 w-1.5 rounded-full ${pos.bg.replace("/10", "")}`} />
          </div>
        </div>
        <div className="min-w-0">
          <p className={`truncate text-sm font-black leading-none ${pos.text}`}>{name}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">#{tag}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.05]" />

      {/* Solo rank */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Solo/Duo</p>
        <RankBadge rank={player.soloRank} />
        {player.soloRank.wins !== undefined && (
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>{player.soloRank.wins}W / {player.soloRank.losses}L</span>
            <span className={`font-black ${player.soloSeasonWinrate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {player.soloSeasonWinrate}%
            </span>
          </div>
        )}
      </div>

      {/* Recent solo stats */}
      {player.soloQueue.games > 0 && (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
            Últimas {player.soloQueue.games} solos
          </p>
          <WinrateBar value={player.soloQueue.winrate} />
          <StatRow label="KDA médio" value={player.soloQueue.avgKda} />
          <div className="flex flex-wrap gap-1 pt-0.5">
            {player.soloQueue.topChampions.slice(0, 4).map((c) => (
              <ChampionTip key={c.championId} champ={c} size={24} />
            ))}
          </div>
        </div>
      )}

      {/* Flex */}
      {player.flexQueue.games > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Flex</p>
          <RankBadge rank={player.flexRank} compact />
          <p className="text-[10px] text-gray-500">
            {player.flexQueue.games}G •{" "}
            <span className={`font-black ${player.flexQueue.winrate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {player.flexQueue.winrate}%
            </span>
            {" "}• {player.flexQueue.avgKda} KDA
          </p>
        </div>
      )}

      {/* Combined top picks */}
      {player.combinedTopChamps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-2.5 w-2.5 text-gray-600" />
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Mais Jogados</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {player.combinedTopChamps.slice(0, 5).map((c) => (
              <ChampionTip key={c.championId} champ={c} size={26} />
            ))}
          </div>
        </div>
      )}

      {/* Mastery */}
      {player.masteryTop10.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Star className="h-2.5 w-2.5 text-amber-500/60" />
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Maestria</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {player.masteryTop10.slice(0, 5).map((m) => (
              <div key={m.championId} className="group/tip relative">
                <div className="transition-transform duration-150 group-hover/tip:scale-110">
                  <ChampionIcon name={m.championName} size={24} ring="border-amber-500/40" />
                </div>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover/tip:opacity-100 transition-all duration-200">
                  <div className="rounded-xl border border-amber-500/20 bg-[#0a0a12]/98 px-3 py-2 text-center shadow-2xl backdrop-blur-xl whitespace-nowrap">
                    <p className="text-xs font-black text-white">{m.championName}</p>
                    <p className="text-[10px] text-amber-400 mt-0.5">M{m.masteryLevel} • {m.masteryPoints.toLocaleString()} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clash history */}
      {player.clashHistory.games > 0 && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Swords className="h-2.5 w-2.5 text-amber-500/70" />
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Clash</p>
            </div>
            <span className={`text-[10px] font-black ${player.clashHistory.winrate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {player.clashHistory.winrate}% WR
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {player.clashHistory.topChampions.slice(0, 3).map((c) => (
                <ChampionTip key={c.championId} champ={c} size={22} />
              ))}
            </div>
            <span className="text-[10px] text-gray-600 tabular-nums">{player.clashHistory.games}G</span>
          </div>
        </div>
      )}

      {/* AI: counterplay */}
      {counterplay && (
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-b from-red-500/[0.06] to-red-500/[0.02] p-2.5 space-y-2 mt-auto">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-red-400 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Provável Pick</p>
          </div>
          <div className="flex items-center gap-2">
            <ChampionIcon name={counterplay.likelyPick} size={30} ring="border-red-500/40" />
            <p className="text-xs font-black text-white">{counterplay.likelyPick}</p>
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

      {/* AI: predicted picks */}
      {predictedPick && (
        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-500/[0.06] to-purple-500/[0.02] p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-purple-400 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-purple-400">Se Banado...</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[predictedPick.option1, predictedPick.option2].map((opt) => (
              <div key={opt.champion} className="flex items-center gap-1.5">
                <ChampionIcon name={opt.champion} size={22} ring="border-purple-500/40" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-white leading-none">{opt.champion}</p>
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

function BanCard({ ban, rank }: { ban: BanSuggestion; rank: number }) {
  const priorityConfig: Record<number, { text: string; border: string; bg: string; badge: string; glow: string }> = {
    1: { text: "text-red-400",    border: "border-red-500/50",    bg: "from-red-500/10 to-red-500/[0.03]",    badge: "bg-red-500 text-white",    glow: "shadow-red-500/30"    },
    2: { text: "text-orange-400", border: "border-orange-500/40", bg: "from-orange-500/8 to-orange-500/[0.02]", badge: "bg-orange-500 text-white", glow: "shadow-orange-500/20" },
    3: { text: "text-amber-400",  border: "border-amber-500/40",  bg: "from-amber-500/8 to-amber-500/[0.02]",  badge: "bg-amber-500 text-black",  glow: "shadow-amber-500/20"  },
    4: { text: "text-yellow-400", border: "border-yellow-500/30", bg: "from-yellow-500/5 to-transparent",       badge: "bg-yellow-500 text-black", glow: "shadow-yellow-500/15" },
    5: { text: "text-gray-400",   border: "border-gray-500/30",   bg: "from-gray-500/5 to-transparent",        badge: "bg-gray-500 text-white",   glow: "shadow-gray-500/10"   },
  }
  const p = ban.priority
  const cfg = priorityConfig[p] ?? priorityConfig[5]

  return (
    <div className={`relative flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b p-4 pt-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-default ${cfg.border} ${cfg.bg} ${rank === 0 ? cfg.glow : ""}`}>
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black shadow-lg ${cfg.badge}`}>
        {p}
      </div>
      <ChampionIcon name={ban.championName} size={52} ring={`${cfg.border}`} />
      <div className="text-center space-y-0.5">
        <p className={`text-sm font-black ${cfg.text}`}>{ban.championName}</p>
        <p className="text-[10px] text-gray-500">→ {ban.targetPlayer.split("#")[0]}</p>
      </div>
      <p className="text-center text-[10px] text-gray-400 leading-tight line-clamp-3">{ban.reason}</p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ScoutSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[520px] rounded-2xl bg-white/[0.03]" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-white/[0.03]" />
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
    <div className="relative space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/10">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Clash <span className="text-amber-400">Scout</span>
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Digite o nick de qualquer jogador para ver o time, stats e análise de IA
          </p>
        </div>
        {data && (
          <button
            onClick={() => { setData(null); setInput("") }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-gray-400 transition-all hover:border-white/[0.15] hover:text-white sm:w-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Nova busca
          </button>
        )}
      </div>

      {/* ── Search form ── */}
      {!data && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#07070c]/60 backdrop-blur-sm p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleScout()}
                placeholder="NomeDoJogador#BR1"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-200"
              />
            </div>
            <button
              onClick={handleScout}
              disabled={loading || !input.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-black transition-all duration-200 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none sm:w-auto"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {loading ? "Buscando..." : "Scout"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-600">
            Qualquer jogador do servidor BR1 — o sistema encontrará o time de Clash automaticamente
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <p className="text-sm text-amber-400 font-semibold">
              Buscando dados do time — isso pode levar alguns segundos...
            </p>
          </div>
          <ScoutSkeleton />
        </div>
      )}

      {/* ── Results ── */}
      {!loading && data && (
        <div className="space-y-6 content-enter">

          {/* Team header */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.03] to-transparent p-5 shadow-xl shadow-black/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(245,158,11,0.08),transparent_60%)]" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                  <Crown className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1">Time de Clash</p>
                  <p className="text-2xl font-black text-white tracking-tight">{data.team.name}</p>
                </div>
              </div>
              <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Sigla</p>
                  <p className="font-black text-white text-sm">{data.team.abbreviation}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center">
                  <p className="text-[9px] text-amber-700 uppercase tracking-wider mb-0.5">Tier</p>
                  <p className="font-black text-amber-400 text-sm">{data.team.tier || "—"}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Jogadores</p>
                  <p className="font-black text-white text-sm">{data.players.length}</p>
                </div>
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
            <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-b from-[#0d0710] to-[#07070c] p-6 space-y-6 shadow-2xl shadow-black/40">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.06),transparent_60%)]" />
              <div className="absolute top-0 right-0 h-px w-1/2 bg-gradient-to-l from-transparent via-red-500/30 to-transparent" />

              {/* AI header */}
              <div className="relative flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 shadow-lg shadow-red-500/10">
                    <Brain className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-black text-white tracking-tight">Análise de IA</p>
                    <p className="text-xs text-gray-500">Recomendações táticas baseadas nos dados do time</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[10px] font-black text-red-400 uppercase tracking-wider">
                  <Flame className="h-3 w-3" />
                  Powered by Claude
                </span>
              </div>

              {/* Strategy */}
              {data.strategy && (
                <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Target className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1.5">Perfil Tático</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{data.strategy}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ban recommendations */}
              {data.bans.length > 0 && (
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-gray-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bans Recomendados</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[...data.bans].sort((a, b) => a.priority - b.priority).map((ban, i) => (
                      <BanCard key={ban.championName} ban={ban} rank={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No AI */}
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
