"use client"

import { ArrowLeftRight, CalendarDays, ShieldCheck, Timer, Users } from "lucide-react"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const TEAMS = ["Fúria", "Resenha FC", "Vila Nova", "Pé Frio"]

const POOL = [
  { name: "Maestro", position: "MEI", overall: 87 },
  { name: "Muralha", position: "ZAG", overall: 84 },
  { name: "Xerife", position: "VOL", overall: 83 },
  { name: "Garçom", position: "PE", overall: 81 },
  { name: "Artilheiro", position: "ATA", overall: 86 },
  { name: "Craque", position: "MC", overall: 85 },
]

function DraftRoom() {
  const { ref, step } = useSequence(POOL.length + 1, 1400)
  const picked = Math.min(step, POOL.length)
  const onTheClock = TEAMS[picked % TEAMS.length]
  const lastPick = picked > 0 ? POOL[picked - 1] : null
  const lastTeam = picked > 0 ? TEAMS[(picked - 1) % TEAMS.length] : null

  return (
    <div ref={ref}>
      <Frame label="timbas.gg/dashboard/draft/liga-timbas" accent="emerald">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-3">
            <span className="flex items-center gap-2.5">
              <Timer className="h-4 w-4 text-emerald-300" />
              <span>
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
                  Na vez de
                </span>
                <span className="block text-[13px] font-black text-white">{onTheClock}</span>
              </span>
            </span>
            <span className="font-mono text-[18px] font-black tabular-nums text-emerald-300">00:12</span>
          </div>

          {/* A barra reinicia a cada escolha, então o relógio da sala fica
              visível sem precisar de contador de verdade. */}
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div key={picked} className="lp-countdown h-full w-full rounded-full bg-emerald-400" />
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Pool da liga</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {POOL.map((player, index) => {
              const taken = index < picked
              return (
                <div
                  key={player.name}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                    taken
                      ? "-translate-y-0.5 border-white/[0.05] bg-black/30 opacity-40"
                      : "border-white/[0.07] bg-white/[0.03]"
                  }`}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 font-mono text-[12px] font-black text-emerald-300">
                    {player.overall}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-white">{player.name}</span>
                    <span className="block text-[10px] text-gray-500">
                      {taken ? `escolhido por ${TEAMS[index % TEAMS.length]}` : player.position}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5">
            <span className="text-[11.5px] text-gray-500">
              {lastPick ? (
                <>
                  <span className="font-bold text-emerald-300">{lastTeam}</span> levou{" "}
                  <span className="font-bold text-white">{lastPick.name}</span>
                </>
              ) : (
                "Sala aberta, ninguém escolheu ainda"
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              elenco confirmado
            </span>
          </div>
        </div>
      </Frame>
    </div>
  )
}

export function DraftStory() {
  return (
    <StorySection
      id="draft"
      eyebrow="Liga Draft"
      title="Monte o elenco no draft e leve a"
      highlight="temporada."
      description="A liga tem base de jogadores, pool, sala de draft com cronômetro e uma temporada inteira depois disso. Cada dono cuida do seu elenco, escala para a rodada e negocia quando precisa reforçar."
      accent="emerald"
      reverse
      media={<DraftRoom />}
      points={[
        {
          icon: Timer,
          title: "Draft ao vivo com relógio correndo",
          text: "Ordem de escolha definida, pool na tela e tempo para cada pick. Quem some perde a vez.",
        },
        {
          icon: CalendarDays,
          title: "Temporada com dias marcados",
          text: "Rodadas nos dias combinados, tabela atualizada e uma temporada que todo mundo acompanha.",
        },
        {
          icon: ArrowLeftRight,
          title: "Elenco vivo entre as rodadas",
          text: "Gestão do elenco e escolhas estratégicas durante toda a temporada.",
        },
        {
          icon: Users,
          title: "Resultado real ou simulado",
          text: "Jogaram no EA FC 26? Mandem a foto do placar e a IA confere. Não deu para jogar? O servidor simula a rodada.",
        },
      ]}
    />
  )
}
