import { Sparkles } from "lucide-react"
import { TeamCrest } from "@/components/competitions/shared"
import { cn } from "@/lib/utils"

interface RatingCardPlayer {
  playerName: string
  primaryPosition?: string | null
  averageRating: number | null
  craqueScore?: number | null
  team?: { name: string; logoUrl: string | null } | null
}

interface RatingCardStat {
  label: string
  value: string
}

const TIERS = [
  {
    minimum: 9.95,
    label: "Lenda",
    shell: "border-amber-200/70 bg-gradient-to-br from-amber-200/35 via-amber-500/20 to-amber-950/95 shadow-amber-500/20",
    accent: "text-amber-100",
    badge: "border-amber-100/50 bg-amber-100/20 text-amber-50",
  },
  {
    minimum: 9,
    label: "Elite",
    shell: "border-fuchsia-400/55 bg-gradient-to-br from-violet-500/35 via-fuchsia-500/15 to-purple-950/95 shadow-violet-500/20",
    accent: "text-fuchsia-200",
    badge: "border-fuchsia-300/40 bg-fuchsia-300/15 text-fuchsia-100",
  },
  {
    minimum: 8,
    label: "Destaque",
    shell: "border-rose-400/45 bg-gradient-to-br from-rose-500/30 via-red-500/10 to-rose-950/95 shadow-rose-500/15",
    accent: "text-rose-200",
    badge: "border-rose-300/35 bg-rose-300/10 text-rose-100",
  },
  {
    minimum: 7,
    label: "Titular",
    shell: "border-cyan-400/35 bg-gradient-to-br from-blue-500/25 via-cyan-500/10 to-slate-950/95 shadow-blue-500/10",
    accent: "text-cyan-200",
    badge: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  },
  {
    minimum: 0,
    label: "Base",
    shell: "border-white/15 bg-gradient-to-br from-slate-500/20 via-slate-700/10 to-slate-950 shadow-black/20",
    accent: "text-slate-300",
    badge: "border-white/15 bg-white/[0.06] text-slate-300",
  },
]

export function ratingCardTier(rating: number | null) {
  const safeRating = Math.max(0, Math.min(10, rating ?? 0))
  return TIERS.find((tier) => safeRating >= tier.minimum) ?? TIERS[TIERS.length - 1]
}

export function PlayerRatingCard({
  player,
  position,
  adapted = false,
  compact = false,
  className,
  emptyLabel = "A definir",
  stats = [],
}: {
  player: RatingCardPlayer | null
  position: string
  adapted?: boolean
  compact?: boolean
  className?: string
  emptyLabel?: string
  stats?: RatingCardStat[]
}) {
  const rating = player ? Math.max(0, Math.min(10, player.averageRating ?? 0)) : null
  const index = player?.craqueScore == null ? null : Math.max(0, Math.min(10, player.craqueScore))
  const tier = ratingCardTier(rating)
  const initials = player?.playerName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  if (!player) {
    return (
      <article className={cn("relative flex aspect-[3/4] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/25 px-2 text-center", className)}>
        <span className="text-[11px] font-black text-gray-500">{position}</span>
        <span className="mt-1 text-[9px] uppercase tracking-wider text-gray-700">{emptyLabel}</span>
      </article>
    )
  }

  return (
    <article
      className={cn(
        "group relative isolate flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl border p-2.5 shadow-xl transition duration-300 hover:-translate-y-1",
        tier.shell,
        compact ? stats.length ? "min-h-[164px]" : "min-h-[138px]" : "min-h-[190px] p-3.5",
        className,
      )}
      title={`${player.playerName}, nota ${rating?.toFixed(1).replace(".", ",")}`}
    >
      <div aria-hidden className="absolute inset-x-2 top-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div aria-hidden className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-2">
        <span>
          <strong className={cn("block font-black leading-none tabular-nums", compact ? "text-[24px]" : "text-[32px]", tier.accent)}>
            {rating?.toFixed(1)}
          </strong>
          <span className="mt-0.5 block text-[7px] font-black uppercase tracking-[0.16em] text-white/45">Nota</span>
        </span>
        <span className={cn("rounded-md border px-1.5 py-1 text-[8px] font-black uppercase tracking-wider", tier.badge)}>{position}</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center py-1">
        <span className={cn("flex items-center justify-center rounded-full border border-white/15 bg-black/25 font-black text-white shadow-inner", compact ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg")}>
          {initials || "?"}
        </span>
      </div>

      <div className="relative border-t border-white/10 pt-2 text-center">
        <h4 className={cn("truncate font-black uppercase tracking-tight text-white", compact ? "text-[10px]" : "text-xs")}>{player.playerName}</h4>
        {stats.length ? <div className={`mt-1.5 grid gap-1 ${stats.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>{stats.map((stat) => <span key={stat.label} className="min-w-0 rounded bg-black/20 px-0.5 py-1"><strong className="block truncate text-[9px] font-black tabular-nums text-white">{stat.value}</strong><small className="block truncate text-[6px] font-black uppercase tracking-wide text-white/40">{stat.label}</small></span>)}</div> : <div className="mt-1 flex items-center justify-center gap-1.5">
          {player.team && <TeamCrest name={player.team.name} logoUrl={player.team.logoUrl} size={compact ? 16 : 20} />}
          <span className="max-w-[78px] truncate text-[8px] font-bold text-white/50">{player.team?.name ?? tier.label}</span>
        </div>}
        <div className="mt-1 flex min-h-3 items-center justify-center gap-1 text-[7px] font-black uppercase tracking-wider text-white/45">
          {index !== null && <span>Índice {index.toFixed(2).replace(".", ",")}</span>}
          {adapted && <span className="text-amber-200">• adaptado</span>}
        </div>
      </div>

      {rating !== null && rating >= 9.95 && <Sparkles className="absolute right-2 top-11 h-3.5 w-3.5 text-amber-100" />}
    </article>
  )
}
