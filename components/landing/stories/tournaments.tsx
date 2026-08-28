"use client"

import { CalendarClock, Gamepad2, GitBranch, Trophy, Users } from "lucide-react"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const FORMATS = ["Eliminação simples", "Eliminação dupla", "Pontos corridos", "Grupos + mata-mata", "Série MD5"]

const SEMIS = [
  { home: "Timbas FC", away: "Pé Frio", score: "3 x 1" },
  { home: "Vila Nova", away: "Resenha FC", score: "2 x 0" },
]

function Slot({
  name,
  score,
  state,
}: {
  name: string
  score?: string
  state: "idle" | "winner" | "loser"
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all duration-500 ${
        state === "winner"
          ? "border-amber-400/40 bg-amber-400/[0.12]"
          : state === "loser"
            ? "border-white/[0.05] bg-black/20 opacity-45"
            : "border-white/[0.07] bg-black/25"
      }`}
    >
      <span className={`flex-1 truncate text-[11.5px] font-bold ${state === "winner" ? "text-amber-200" : "text-gray-300"}`}>
        {name || "A definir"}
      </span>
      {score && <span className="font-mono text-[10.5px] tabular-nums text-gray-500">{score}</span>}
    </div>
  )
}

function Bracket() {
  const { ref, step } = useSequence(6, 1150)
  const format = FORMATS[step % FORMATS.length]

  const semiDecided = (index: number) => step >= index + 1
  const finalists = [semiDecided(0) ? SEMIS[0].home : "", semiDecided(1) ? SEMIS[1].home : ""]
  const finalDecided = step >= 3
  const champion = step >= 4

  return (
    <div ref={ref}>
      <Frame label="timbas.gg/tournaments" accent="amber">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((option) => (
              <span
                key={option}
                className={`rounded-md border px-2 py-1 text-[10px] font-bold transition-all duration-500 ${
                  option === format
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-white/[0.06] text-gray-600"
                }`}
              >
                {option}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            <div className="space-y-4">
              {SEMIS.map((match, index) => (
                <div key={match.home} className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-600">Semifinal {index + 1}</p>
                  <Slot
                    name={match.home}
                    score={semiDecided(index) ? match.score.split(" x ")[0] : undefined}
                    state={semiDecided(index) ? "winner" : "idle"}
                  />
                  <Slot
                    name={match.away}
                    score={semiDecided(index) ? match.score.split(" x ")[1] : undefined}
                    state={semiDecided(index) ? "loser" : "idle"}
                  />
                </div>
              ))}
            </div>

            <div className="flex h-full flex-col items-center justify-center">
              <span className="h-24 w-px bg-white/[0.08]" />
              <GitBranch className="my-1 h-3.5 w-3.5 rotate-90 text-gray-700" />
              <span className="h-24 w-px bg-white/[0.08]" />
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-600">Final</p>
              <Slot name={finalists[0]} score={finalDecided ? "2" : undefined} state={finalDecided ? "winner" : "idle"} />
              <Slot name={finalists[1]} score={finalDecided ? "0" : undefined} state={finalDecided ? "loser" : "idle"} />

              <div
                className={`overflow-hidden transition-all duration-500 ${champion ? "mt-3 max-h-24 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/[0.14] to-transparent px-3 py-2.5">
                  <Trophy className="h-4 w-4 flex-shrink-0 text-amber-300" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-black text-white">Timbas FC</span>
                    <span className="block text-[10px] text-amber-300/80">campeão da Copa Timbas</span>
                  </span>
                </div>
              </div>
            </div>
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
      eyebrow="Campeonatos"
      title="Chave montada, resultado lançado, campeão"
      highlight="definido."
      description="Crie o campeonato, abra as inscrições e deixe a plataforma cuidar do resto. Cada resultado empurra a chave sozinho, e todo mundo acompanha pelo mesmo link."
      accent="amber"
      reverse
      media={<Bracket />}
      points={[
        {
          icon: GitBranch,
          title: "Cinco formatos de disputa",
          text: "Eliminação simples, eliminação dupla, pontos corridos, grupos com mata-mata e série melhor de 3, 5 ou 7.",
        },
        {
          icon: Gamepad2,
          title: "Seis jogos na mesma casa",
          text: "EA Sports FC, League of Legends, Valorant, Counter-Strike, Rocket League ou o que a galera inventar.",
        },
        {
          icon: Users,
          title: "Time se inscreve sozinho",
          text: "O capitão monta o elenco, entra na chave e a organização só aprova quando precisa.",
        },
        {
          icon: CalendarClock,
          title: "Janela de inscrição com hora marcada",
          text: "As inscrições fecham no horário combinado e o campeonato começa sem ninguém correndo atrás.",
        },
      ]}
    />
  )
}
