import { CheckCircle2, Crown, GitBranch, Sparkles, Trophy } from "lucide-react"
import { PlayerRatingCard } from "@/components/competitions/player-rating-card"

const MVP_PLAYERS = [
  { playerName: "Nando", primaryPosition: "ATA", averageRating: 10, craqueScore: 10, team: { name: "Timbas FC", logoUrl: null } },
  { playerName: "DK", primaryPosition: "MEI", averageRating: 9.4, craqueScore: 9.72, team: { name: "Vila Nova", logoUrl: null } },
  { playerName: "Rodrigo", primaryPosition: "ZAG", averageRating: 8.7, craqueScore: 9.05, team: { name: "Resenha FC", logoUrl: null } },
]

function BracketMatch({ home, away, score, winner }: { home: string; away: string; score: string; winner: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/25 p-2">
      <div className={`flex items-center justify-between gap-2 text-[9px] font-bold ${winner === home ? "text-amber-200" : "text-gray-500"}`}>
        <span className="truncate">{home}</span><span>{score.split("-")[0]}</span>
      </div>
      <div className="my-1 h-px bg-white/[0.05]" />
      <div className={`flex items-center justify-between gap-2 text-[9px] font-bold ${winner === away ? "text-amber-200" : "text-gray-500"}`}>
        <span className="truncate">{away}</span><span>{score.split("-")[1]}</span>
      </div>
    </div>
  )
}

export function HeroTournamentPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-300/20 bg-[#09090d] shadow-2xl shadow-black/70">
      <div className="h-px bg-gradient-to-r from-amber-300/70 via-red-400/30 to-transparent" />
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200"><Trophy className="h-3.5 w-3.5" /></span>
        <span className="min-w-0"><strong className="block truncate text-[11px] text-white">Copa Timbas</strong><span className="block text-[8px] text-gray-600">EA Sports FC · mata-mata</span></span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2 py-1 text-[7px] font-black uppercase tracking-wider text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Ao vivo</span>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-amber-300"><GitBranch className="h-3 w-3" /> Chave atualizada</div>
        <div className="mt-2 grid grid-cols-[1fr_18px_1fr] items-center gap-1.5">
          <div className="space-y-2">
            <BracketMatch home="Timbas FC" away="Pé Frio" score="3-1" winner="Timbas FC" />
            <BracketMatch home="Vila Nova" away="Resenha" score="2-0" winner="Vila Nova" />
          </div>
          <GitBranch className="h-4 w-4 rotate-90 text-gray-700" />
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.07] p-2.5 text-center">
            <Crown className="mx-auto h-4 w-4 text-amber-200" />
            <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-gray-600">Final</p>
            <p className="mt-1 truncate text-[10px] font-black text-white">Timbas FC</p>
            <p className="text-[8px] text-gray-600">× Vila Nova</p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.05] px-2.5 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
          <span className="min-w-0"><strong className="block truncate text-[9px] text-cyan-100">Placar encontrado na EA</strong><span className="block truncate text-[7px] text-gray-600">Resultado, notas e posições importados</span></span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.14em] text-fuchsia-300"><Sparkles className="h-3 w-3" /> MVPs da rodada</span>
          <span className="text-[7px] font-bold text-gray-700">cartas automáticas</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {MVP_PLAYERS.map((player) => (
            <PlayerRatingCard key={player.playerName} player={player} position={player.primaryPosition} compact />
          ))}
        </div>
      </div>
    </div>
  )
}
