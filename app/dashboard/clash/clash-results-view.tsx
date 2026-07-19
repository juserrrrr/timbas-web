"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ShieldAlert, Trophy, Swords, Target, Brain,
  Shield, Star, TrendingUp, Flame, Crown,
  Zap, Crosshair, Map as MapIcon,
} from "lucide-react"
import {
  ScoutResult, ScoutPlayer, BanSuggestion, CounterplayAdvice, PredictedPick,
  QueueChampStat, ThreatAssessment, getChampionIconUrl, getRankColor, getRankBg, formatRank, RankInfo,
} from "@/lib/services/clash"

const POSITION_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Support", FILL: "Fill",
}

const ROLE_ORDER = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT", "FILL"]

// ─── Rank médio do time ───────────────────────────────────────────────────────

const TIER_SEQUENCE = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]
const TIER_PT = ["Ferro", "Bronze", "Prata", "Ouro", "Platina", "Esmeralda", "Diamante", "Mestre", "Grão-Mestre", "Challenger"]
const DIVISION_VALUE: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 }

function rankValue(rank?: RankInfo): number | null {
  const tierIndex = TIER_SEQUENCE.indexOf(rank?.tier?.toUpperCase() ?? "")
  if (tierIndex < 0) return null
  return tierIndex * 4 + (DIVISION_VALUE[rank?.rank?.toUpperCase() ?? ""] ?? 0)
}

function averageRankLabel(players: ScoutPlayer[]): { label: string; tier: string } {
  const values = players
    .map((p) => rankValue(p.soloRank) ?? rankValue(p.flexRank))
    .filter((v): v is number => v !== null)
  if (!values.length) return { label: "N/D", tier: "" }
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const tierIndex = Math.min(TIER_SEQUENCE.length - 1, Math.floor(avg / 4))
  const divisions = ["IV", "III", "II", "I"]
  const division = tierIndex >= 7 ? "" : ` ${divisions[Math.min(3, Math.round(avg - tierIndex * 4))]}`
  return { label: `${TIER_PT[tierIndex]}${division}`, tier: TIER_SEQUENCE[tierIndex] }
}

const POSITION_COLORS: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  TOP:     { text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", glow: "shadow-orange-500/20" },
  JUNGLE:  { text: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10",  glow: "shadow-green-500/20"  },
  MID:     { text: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10",   glow: "shadow-blue-500/20"   },
  ADC:     { text: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/10",    glow: "shadow-red-500/20"    },
  SUPPORT: { text: "text-purple-400", border: "border-purple-500/40", bg: "bg-purple-500/10", glow: "shadow-purple-500/20" },
  FILL:    { text: "text-gray-400",   border: "border-gray-500/40",   bg: "bg-gray-500/10",   glow: "shadow-gray-500/20"   },
}

function ChampionIcon({ name, championId, size = 32, ring }: { name: string; championId?: number; size?: number; ring?: string }) {
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
        src={getChampionIconUrl(name, championId)}
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
  const src = url?.replace(/^http:\/\//, "https://")
  const border = posColor ?? "border-amber-500/50"
  if (err || !src) {
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
      <Image src={src} alt="icon" width={size} height={size} className="object-cover w-full h-full" onError={() => setErr(true)} unoptimized />
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
        <ChampionIcon name={champ.championName} championId={champ.championId} size={size} />
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

function ThreatDots({ level }: { level: number }) {
  const color = level >= 5 ? "bg-red-400" : level >= 4 ? "bg-orange-400" : level >= 3 ? "bg-amber-400" : "bg-gray-500"
  return (
    <div className="flex items-center gap-0.5" title={`Ameaça ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i <= level ? color : "bg-white/[0.08]"}`} />
      ))}
    </div>
  )
}

function PlayerCard({ player, index, counterplay, predictedPick, threat, isFocus, isWeakLink }: {
  player: ScoutPlayer
  index: number
  counterplay?: CounterplayAdvice
  predictedPick?: PredictedPick
  threat?: ThreatAssessment
  isFocus?: boolean
  isWeakLink?: boolean
}) {
  const pos = POSITION_COLORS[player.position] ?? POSITION_COLORS.FILL
  const [name, tag] = player.riotId.split("#")

  return (
    <div
      className={`group flex flex-col gap-3 rounded-2xl border bg-[#07070c]/80 p-4 shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl ${pos.glow} ${
        isFocus ? "border-red-500/30 hover:border-red-500/45" : isWeakLink ? "border-emerald-500/25 hover:border-emerald-500/40" : "border-white/[0.07] hover:border-white/[0.14]"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Position badge + threat + clash tag */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${pos.text} ${pos.border} ${pos.bg}`}>
          {POSITION_LABELS[player.position] ?? player.position}
        </span>
        <div className="flex items-center gap-1.5">
          {threat && <ThreatDots level={threat.level} />}
          {player.clashHistory.games > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-400 uppercase tracking-wider">
              <Swords className="h-2.5 w-2.5" />
              Clash
            </span>
          )}
        </div>
      </div>

      {/* Foco / elo fraco */}
      {(isFocus || isWeakLink) && (
        <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${isFocus ? "border-red-500/25 bg-red-500/[0.06]" : "border-emerald-500/20 bg-emerald-500/[0.05]"}`}>
          <Crosshair className={`h-3 w-3 flex-shrink-0 ${isFocus ? "text-red-400" : "text-emerald-400"}`} />
          <p className={`text-[9px] font-black uppercase tracking-widest ${isFocus ? "text-red-400" : "text-emerald-400"}`}>
            {isFocus ? "Maior ameaça, foquem nele" : "Elo fraco, joguem em cima"}
          </p>
        </div>
      )}

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
            Últimas {player.soloQueue.games} partidas
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
                  <ChampionIcon name={m.championName} championId={m.championId} size={24} ring="border-amber-500/40" />
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
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Histórico Clash</p>
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

      {/* Deep Scout: leitura de mapa via timeline */}
      {player.mapProfile && player.mapProfile.games > 0 && (
        <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.04] p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapIcon className="h-2.5 w-2.5 text-sky-400/70" />
              <p className="text-[9px] font-black uppercase tracking-widest text-sky-500">Leitura de Mapa</p>
            </div>
            <span className="text-[9px] text-gray-600 tabular-nums">
              {player.mapProfile.games}G{player.mapProfile.sampleConfidence ? ` · confiança ${player.mapProfile.sampleConfidence}` : ""}
            </span>
          </div>
          {player.position === "JUNGLE" && (
            <>
              <StatRow label="Foco estimado de gank" value={player.mapProfile.likelyGankFocus} highlight />
              {player.mapProfile.startSide && player.mapProfile.startSide !== "inconclusivo" && (
                <StatRow label="Lado inicial provável" value={`${player.mapProfile.startSide} · ${player.mapProfile.startSideConfidence ?? 0}% confiança`} highlight />
              )}
              {player.mapProfile.earlyGanksPerGame !== undefined && (
                <StatRow
                  label="Ações de gank early/jogo"
                  value={player.mapProfile.earlyGanksPerGame}
                />
              )}
              {player.mapProfile.ganksByLane && player.mapProfile.ganksByLane.total > 0 && (
                <StatRow label="Distribuição de ganks" value={`top ${player.mapProfile.ganksByLane.top} · mid ${player.mapProfile.ganksByLane.mid} · bot ${player.mapProfile.ganksByLane.bot}`} />
              )}
              {player.mapProfile.avgFirstGankMinute != null && (
                <StatRow label="Primeiro gank estimado" value={`${player.mapProfile.firstGankFocus} · ${player.mapProfile.avgFirstGankMinute} min`} />
              )}
            </>
          )}
          {player.position !== "JUNGLE" && (player.mapProfile.roamsPerGame ?? 0) > 0 && (
            <StatRow label="Roams early/jogo" value={`${player.mapProfile.roamsPerGame} · foco ${player.mapProfile.roamFocus}`} highlight />
          )}
          <StatRow label="Luta mais em" value={player.mapProfile.mostFought} />
          <StatRow label="Morre mais em" value={player.mapProfile.mostDeaths} />
          {(player.mapProfile.invadeRate ?? 0) > 0 && (
            <StatRow label="Invade em jogos" value={`${player.mapProfile.invadeRate}% (${player.mapProfile.invadeGames}G)`} />
          )}
          {player.mapProfile.objectiveBreakdown && player.mapProfile.objectiveFights > 0 && (
            <StatRow label="Participação em objetivos" value={`drag ${player.mapProfile.objectiveBreakdown.dragons} · barão ${player.mapProfile.objectiveBreakdown.barons} · arauto ${player.mapProfile.objectiveBreakdown.heralds}`} />
          )}
        </div>
      )}

      {/* AI: picks prováveis (counterplay + predicted) */}
      {(counterplay || predictedPick) && (
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-b from-red-500/[0.06] to-red-500/[0.02] p-2.5 space-y-2 mt-auto">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-red-400 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Picks Prováveis</p>
          </div>

          {/* Pick principal */}
          {counterplay && (
            <>
              <div className="flex items-center gap-2">
                <ChampionIcon name={counterplay.likelyPick} size={28} ring="border-red-500/40" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider leading-none mb-0.5">1º Provável</p>
                  <p className="text-xs font-black text-white leading-tight">{counterplay.likelyPick}</p>
                </div>
              </div>
              {counterplay.howToCounter && (
                <p className="text-[10px] text-gray-400 leading-snug">{counterplay.howToCounter}</p>
              )}
            </>
          )}

          {/* Se Banido: 2 alternativas (filtra duplicata do pick principal) */}
          {predictedPick && (() => {
            const mainPick = counterplay?.likelyPick?.toLowerCase() ?? ''
            const alts = [predictedPick.option1, predictedPick.option2].filter(
              (opt) => opt.champion.toLowerCase() !== mainPick
            )
            if (!alts.length) return null
            return (
              <div className="space-y-1.5 pt-1.5 border-t border-white/[0.05]">
                <p className="text-[9px] text-purple-400 font-black uppercase tracking-wider">Se Banido...</p>
                <div className={`grid gap-2 ${alts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {alts.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <ChampionIcon name={opt.champion} size={22} ring="border-purple-500/40" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white leading-none">{opt.champion}</p>
                        <p className="text-[9px] text-gray-500 leading-snug line-clamp-2">{opt.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Ameaças */}
          {counterplay?.keyThreats && counterplay.keyThreats.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {counterplay.keyThreats.map((t, i) => (
                <span key={i} className="rounded-md bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
    <div className={`relative flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b p-4 pt-6 transition-all duration-300 hover:shadow-xl cursor-default ${cfg.border} ${cfg.bg} ${rank === 0 ? cfg.glow : ""}`}>
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black shadow-lg ${cfg.badge}`}>
        {p}
      </div>
      <ChampionIcon name={ban.championName} championId={ban.championId} size={48} ring={`${cfg.border}`} />
      <div className="text-center space-y-0.5">
        <p className={`text-sm font-black ${cfg.text}`}>{ban.championName}</p>
        <p className="text-[10px] text-gray-500">→ {ban.targetPlayer.split("#")[0]}</p>
      </div>
      <p className="text-center text-[10px] text-gray-400 leading-tight line-clamp-3">{ban.reason}</p>
    </div>
  )
}

export default function ClashResultsView({ data }: { data: ScoutResult }) {
  const sortedPlayers = [...data.players].sort(
    (a, b) => ROLE_ORDER.indexOf(a.position) - ROLE_ORDER.indexOf(b.position),
  )
  const avgRank = averageRankLabel(data.players)
  const legacyFallback = /^(gemini|configure gemini_api_key)/i.test(data.strategy.trim())
  const aiGenerated = data.aiGenerated === true
    || (data.aiGenerated === undefined && Boolean(data.strategy) && !legacyFallback)
  const plan = aiGenerated ? data.gamePlan : undefined
  const threatByRiotId = new Map(
    (plan?.threats ?? []).map((t) => [t.riotId.toLowerCase(), t]),
  )
  const focusId = plan?.focusTarget?.toLowerCase()
  const weakId = plan?.weakLink?.toLowerCase()
  const focusPlayer = data.players.find((p) => p.riotId.toLowerCase() === focusId)
  const weakPlayer = data.players.find((p) => p.riotId.toLowerCase() === weakId)
  const jungler = data.players.find((p) => p.position === "JUNGLE")
  const junglerMap = jungler?.mapProfile?.games ? jungler.mapProfile : undefined

  return (
    <div className="space-y-6">
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
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Sigla</p>
              <p className="font-black text-white text-sm">{data.team.abbreviation}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center">
              <p className="text-[9px] text-amber-700 uppercase tracking-wider mb-0.5">Tier</p>
              <p className="font-black text-amber-400 text-sm">{data.team.tier || "N/D"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Rank Médio</p>
              <p className={`font-black text-sm ${getRankColor(avgRank.tier)}`}>{avgRank.label}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Jogadores</p>
              <p className="font-black text-white text-sm">{data.players.length}</p>
            </div>
          </div>
        </div>

        {/* Resumo tático — as decisões de draft num relance */}
        {aiGenerated && (focusPlayer || weakPlayer || junglerMap) && (
          <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
            <span className="mr-1 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Resumo tático</span>
            {focusPlayer && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/[0.08] px-2.5 py-1 text-[11px] font-bold text-red-400">
                <Crosshair className="h-3 w-3" />
                Focar: <span className="font-black text-white">{focusPlayer.riotId.split("#")[0]}</span>
                <span className="text-red-500/80">· {POSITION_LABELS[focusPlayer.position] ?? focusPlayer.position}</span>
              </span>
            )}
            {weakPlayer && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                <Target className="h-3 w-3" />
                Explorar: <span className="font-black text-white">{weakPlayer.riotId.split("#")[0]}</span>
                <span className="text-emerald-500/80">· {POSITION_LABELS[weakPlayer.position] ?? weakPlayer.position}</span>
              </span>
            )}
            {junglerMap && junglerMap.startSide && junglerMap.startSide !== "inconclusivo" && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/[0.07] px-2.5 py-1 text-[11px] font-bold text-sky-400">
                <MapIcon className="h-3 w-3" />
                Lado inicial provável: <span className="font-black text-white">{junglerMap.startSide}</span>
                {junglerMap.startSideConfidence !== undefined && <span className="text-sky-500/80">· {junglerMap.startSideConfidence}%</span>}
              </span>
            )}
            {junglerMap && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/[0.07] px-2.5 py-1 text-[11px] font-bold text-sky-400">
                <Swords className="h-3 w-3" />
                Gank: <span className="font-black text-white">{junglerMap.likelyGankFocus}</span>
                {junglerMap.earlyGanksPerGame !== undefined && (
                  <span className="text-sky-500/80">· {junglerMap.earlyGanksPerGame}/jogo</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {data.teamProfile && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Identidade coletiva medida</p>
              <p className="text-xs text-gray-500">Partidas de Clash compartilhadas pelo núcleo atual</p>
            </div>
            <span className="text-[10px] text-gray-500">{data.teamProfile.games}G · confiança {data.teamProfile.sampleConfidence}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <StatRow label="Vitórias" value={`${data.teamProfile.winrate}%`} highlight />
            <StatRow label="Duração média" value={`${data.teamProfile.avgDurationMinutes} min`} />
            <StatRow label="K / D" value={`${data.teamProfile.avgKills} / ${data.teamProfile.avgDeaths}`} />
            <StatRow label="Dragões" value={`${data.teamProfile.avgDragons}/jogo`} />
            <StatRow label="Barões" value={`${data.teamProfile.avgBarons}/jogo`} />
            <StatRow label="Torres" value={`${data.teamProfile.avgTowers}/jogo`} />
            <StatRow label="First blood" value={`${data.teamProfile.firstBloodRate}%`} />
            <StatRow label="Carry de dano" value={`${data.teamProfile.mainCarry.split("#")[0]} · ${data.teamProfile.mainCarryDamageShare}%`} highlight />
          </div>
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {sortedPlayers.map((player, i) => {
          const rid = player.riotId.toLowerCase()
          const counterplay = aiGenerated ? (
            data.counterplays.find((c) => c.riotId.toLowerCase() === rid) ??
            data.counterplays.find((c) => c.position === player.position)
          ) : undefined
          const predictedPick = aiGenerated ? (
            data.predictedPicks.find((p) => p.riotId.toLowerCase() === rid) ??
            data.predictedPicks.find((p) => p.position === player.position)
          ) : undefined
          return (
            <PlayerCard
              key={player.riotId}
              player={player}
              index={i}
              counterplay={counterplay}
              predictedPick={predictedPick}
              threat={threatByRiotId.get(rid)}
              isFocus={focusId === rid}
              isWeakLink={weakId === rid}
            />
          )
        })}
      </div>

      {/* Plano de Jogo */}
      {plan && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#071009] to-[#07070c] p-6 space-y-5 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.06),transparent_60%)]" />
          <div className="absolute top-0 left-0 h-px w-1/2 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-lg shadow-emerald-500/10">
              <Target className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-black text-white tracking-tight">Plano de Jogo</p>
              <p className="text-xs text-gray-500">Como vencer este time: condição de vitória, early game e teamfight</p>
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Condição de Vitória</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{plan.winCondition}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Early Game</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{plan.earlyGame}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="h-3.5 w-3.5 text-red-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Teamfight</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{plan.teamfight}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Perfil de Dano / Itemização</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{plan.damageProfile}</p>
            </div>
          </div>

          {plan.threats.length > 0 && (
            <div className="relative space-y-2">
              <div className="flex items-center gap-2">
                <Crosshair className="h-3.5 w-3.5 text-gray-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ranking de Ameaça</p>
              </div>
              <div className="space-y-1.5">
                {[...plan.threats].sort((a, b) => b.level - a.level).map((t) => {
                  const tid = t.riotId.toLowerCase()
                  return (
                    <div key={t.riotId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                      <span className={`w-16 text-[10px] font-black uppercase tracking-wider ${(POSITION_COLORS[t.position] ?? POSITION_COLORS.FILL).text}`}>
                        {POSITION_LABELS[t.position] ?? t.position}
                      </span>
                      <span className="text-xs font-black text-white">{t.riotId.split("#")[0]}</span>
                      <ThreatDots level={t.level} />
                      {tid === focusId && (
                        <span className="rounded-md border border-red-500/25 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-400">Focar</span>
                      )}
                      {tid === weakId && (
                        <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-400">Explorar</span>
                      )}
                      <span className="min-w-0 flex-1 text-[11px] text-gray-500">{t.reason}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI analysis */}
      {aiGenerated && (data.bans.length > 0 || data.counterplays.length > 0 || data.strategy) && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-b from-[#0d0710] to-[#07070c] p-6 space-y-6 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.06),transparent_60%)]" />
          <div className="absolute top-0 right-0 h-px w-1/2 bg-gradient-to-l from-transparent via-red-500/30 to-transparent" />

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
              Powered by Gemini
            </span>
          </div>

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

          {data.bans.length > 0 && (
            <div className="relative space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-gray-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bans Recomendados</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-5 xl:grid-cols-10">
                {[...data.bans].sort((a, b) => a.priority - b.priority).map((ban, i) => (
                  <BanCard key={i} ban={ban} rank={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
