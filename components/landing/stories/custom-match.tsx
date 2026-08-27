"use client"

import { ArrowUp, Dices, History, Radio, Shuffle, Swords } from "lucide-react"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const BLUE = ["zK", "Pudim", "Careca", "Mavs", "Bagre"]
const RED = ["Tio Rick", "Duda", "Léo", "Rafa", "Neto"]

const RANKING = [
  { name: "Pudim", points: 42 },
  { name: "zK", points: 39 },
  { name: "Mavs", points: 37 },
  { name: "Careca", points: 35 },
]

const CLOCK = ["24:13", "26:41", "28:55", "31:02"]

function LiveMatch() {
  const { ref, step } = useSequence(7, 1100)
  const finished = step >= 4
  const ranked = step >= 5
  const clock = CLOCK[Math.min(step, CLOCK.length - 1)]

  return (
    <div ref={ref}>
      <Frame label="timbas.gg/dashboard/match/143" accent="blue">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  finished ? "bg-white/[0.06] text-gray-400" : "bg-red-600 text-white"
                }`}
              >
                <Radio className="h-3 w-3" />
                {finished ? "encerrada" : "ao vivo"}
              </span>
              <span className="font-mono text-[11px] text-gray-500">Partida #143 · Aleatório · Normal</span>
            </div>
            <span className="font-mono text-[13px] font-bold tabular-nums text-white">{finished ? "32:07" : clock}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { team: "TimeAzul", names: BLUE, tone: "blue", won: true },
              { team: "TimeVermelho", names: RED, tone: "red", won: false },
            ].map((side) => (
              <div
                key={side.team}
                className={`rounded-xl border p-3 transition-all duration-500 ${
                  finished && side.won
                    ? "border-blue-400/40 bg-blue-500/[0.12]"
                    : finished
                      ? "border-white/[0.06] bg-black/20 opacity-60"
                      : side.tone === "blue"
                        ? "border-blue-400/20 bg-blue-500/[0.06]"
                        : "border-red-400/20 bg-red-500/[0.06]"
                }`}
              >
                <p
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    side.tone === "blue" ? "text-blue-300" : "text-red-300"
                  }`}
                >
                  {side.team}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {side.names.map((name) => (
                    <li key={name} className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[9px] font-black ${
                          side.tone === "blue" ? "bg-blue-500/20 text-blue-200" : "bg-red-500/20 text-red-200"
                        }`}
                      >
                        {name.slice(0, 1)}
                      </span>
                      <span className="truncate text-[12px] text-gray-300">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className={`mt-3 overflow-hidden transition-all duration-500 ${finished ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <p className="rounded-xl border border-blue-400/25 bg-blue-500/[0.08] px-3.5 py-2.5 text-[12px] font-bold text-blue-200">
              TimeAzul venceu. Resultado registrado no histórico.
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/25 p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">Ranking do servidor</p>
            <ul className="space-y-1">
              {RANKING.map((player, index) => {
                const climbed = ranked && player.name === "zK"
                return (
                  <li
                    key={player.name}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-500 ${
                      climbed ? "-translate-y-0.5 bg-emerald-500/10" : ""
                    }`}
                  >
                    <span className="w-4 text-[11px] font-black text-gray-600">{index + 1}º</span>
                    <span className="flex-1 truncate text-[12px] text-gray-300">{player.name}</span>
                    {climbed && <ArrowUp className="h-3 w-3 text-emerald-400" />}
                    <span className="font-mono text-[11px] tabular-nums text-gray-500">
                      {player.points + (climbed ? 1 : 0)} pts
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Frame>
    </div>
  )
}

export function CustomMatchStory() {
  return (
    <StorySection
      id="partidas"
      eyebrow="Partida personalizada"
      title="A partida começa no chat e termina no"
      highlight="ranking."
      description="O organizador abre a sala com um comando, a galera confirma no botão e o bot sorteia os times. Quem quiser acompanhar pelo navegador vê a partida ao vivo, e no fim tudo já está registrado."
      accent="blue"
      media={<LiveMatch />}
      points={[
        {
          icon: Swords,
          title: "Do 1v1 ao 5v5, no formato da mesa",
          text: "Aleatório, Livre ou Balanceado por nível, em Normal, League Classic ou ARAM.",
        },
        {
          icon: Shuffle,
          title: "Times sorteados na hora",
          text: "Com dez confirmados, um clique divide o TimeAzul e o TimeVermelho e a partida sobe.",
        },
        {
          icon: History,
          title: "O ranking nasce do histórico",
          text: "Vitórias, sequências, duplas que rendem e confronto direto saem das partidas registradas, nunca de ponto digitado na mão.",
        },
        {
          icon: Dices,
          title: "Modo offline para o rachão",
          text: "Quando é só para dividir time rápido, a partida roda sem entrar em nenhuma estatística.",
        },
      ]}
    />
  )
}
