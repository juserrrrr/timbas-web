"use client"

import { BarChart3, CheckCircle2, GitBranch, ScanLine, ShieldCheck, Sparkles, Trophy } from "lucide-react"
import { PlayerRatingCard } from "@/components/competitions/player-rating-card"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const AUTOMATION_STEPS = [
  "Partidas criadas pela tabela",
  "Jogo encontrado na EA",
  "Placar e atletas importados",
  "Chave e seleção atualizadas",
]

const FEATURED_PLAYERS = [
  { playerName: "Nando", primaryPosition: "ST", averageRating: 10, craqueScore: 10, team: { name: "Timbas FC", logoUrl: null } },
  { playerName: "DK", primaryPosition: "CAM", averageRating: 9.4, craqueScore: 9.72, team: { name: "Vila Nova", logoUrl: null } },
  { playerName: "Rodrigo", primaryPosition: "CB", averageRating: 8.7, craqueScore: 9.05, team: { name: "Resenha FC", logoUrl: null } },
]

function TournamentCenter() {
  const { ref, step } = useSequence(AUTOMATION_STEPS.length, 1450)

  return (
    <div ref={ref}>
      <Frame label="copa timbas · central do campeonato" accent="amber">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">EA Sports FC · 8 clubes</p>
              <h3 className="mt-1 text-base font-black text-white">Copa Pro Clubs</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Automático
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/25 p-3.5">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.14em] text-gray-600">
              <span>Semifinal · encerrada</span>
              <span>EA verificada</span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div><p className="truncate text-[12px] font-black text-white">Timbas FC</p><p className="mt-0.5 text-[9px] text-gray-600">Mandante</p></div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1.5 font-mono text-lg font-black tabular-nums text-amber-200">3 <span className="text-gray-700">×</span> 1</div>
              <div className="text-right"><p className="truncate text-[12px] font-black text-white">Vila Nova</p><p className="mt-0.5 text-[9px] text-gray-600">Visitante</p></div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {AUTOMATION_STEPS.map((label, index) => {
              const active = index <= step
              return (
                <div key={label} className={`rounded-lg border px-2 py-2 transition duration-500 ${active ? "border-emerald-400/25 bg-emerald-400/[0.07]" : "border-white/[0.06] bg-white/[0.015]"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 transition-colors ${active ? "text-emerald-300" : "text-gray-700"}`} />
                  <p className={`mt-1.5 text-[7px] font-bold leading-tight transition-colors sm:text-[8px] ${active ? "text-gray-300" : "text-gray-700"}`}>{label}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-fuchsia-300"><Sparkles className="h-3 w-3" /> Seleção do campeonato</p>
              <p className="mt-0.5 text-[9px] text-gray-600">Posição real, nota até 10 e carta por faixa.</p>
            </div>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[8px] font-black text-gray-500">4-3-3</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {FEATURED_PLAYERS.map((player) => (
              <PlayerRatingCard key={player.playerName} player={player} position={player.primaryPosition} compact />
            ))}
          </div>
        </div>
      </Frame>
    </div>
  )
}

export function TournamentsStory() {
  return (
    <StorySection
      id="campeonatos"
      eyebrow="Campeonato de EA FC"
      title="Do primeiro confronto ao 4-3-3, o campeonato"
      highlight="anda sozinho."
      description="O Timbas cria as partidas, procura cada jogo na EA, aplica o placar, avança a chave e transforma posição, nota, gols e assistências em uma seleção completa do campeonato."
      accent="amber"
      reverse
      media={<TournamentCenter />}
      points={[
        {
          icon: GitBranch,
          title: "Tabela e partidas automáticas",
          text: "Grupos, pontos corridos ou mata-mata. O próximo confronto nasce assim que o anterior termina.",
        },
        {
          icon: ScanLine,
          title: "Placar buscado direto na EA",
          text: "Os clubes jogam normalmente no Pro Clubs. O servidor encontra a partida certa e fecha o resultado.",
        },
        {
          icon: BarChart3,
          title: "Posição, nota e estatísticas reais",
          text: "Cada atuação alimenta artilharia, assistências, índice do craque e a posição mais jogada do atleta.",
        },
        {
          icon: Trophy,
          title: "Seleção 4-3-3 e cards por nível",
          text: "Os onze melhores aparecem no campo. Nota 10 vira ouro, 9+ ganha roxo e as faixas ficam mais simples ao cair.",
        },
        {
          icon: ShieldCheck,
          title: "Resultado com trilha de validação",
          text: "Se a EA falhar, a organização ainda pode revisar a prova sem travar o andamento da competição.",
        },
      ]}
    />
  )
}
