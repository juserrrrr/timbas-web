"use client"

import { Ban, Brain, Search, ShieldCheck, Swords, UserSearch } from "lucide-react"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const NICK = "Timbas Dev#BR1"

const CHAMPIONS = [
  { name: "Yasuo", games: 41, tone: "bg-violet-400" },
  { name: "Ahri", games: 28, tone: "bg-violet-400/70" },
  { name: "Lee Sin", games: 17, tone: "bg-violet-400/50" },
]

function ScoutCard() {
  const { ref, step } = useSequence(NICK.length + 5, 240)
  const typed = NICK.slice(0, Math.min(step, NICK.length))
  const searching = step === NICK.length
  const found = step > NICK.length
  const bars = step > NICK.length + 1
  const suggestion = step > NICK.length + 2

  return (
    <div ref={ref}>
      <Frame label="timbas.gg/dashboard/clash" accent="violet">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5">
            <Search className="h-4 w-4 flex-shrink-0 text-gray-600" />
            <span className="font-mono text-[12.5px] text-white">
              {typed}
              <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-violet-400" />
            </span>
          </div>

          <div
            className={`mt-3 transition-all duration-500 ${found ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          >
            <div className="flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3.5 py-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-[13px] font-black text-violet-200">
                TD
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-black text-white">Timbas Dev</span>
                <span className="block text-[11px] text-gray-500">Esmeralda II · 62% de vitória nas últimas 20</span>
              </span>
              <span className="hidden rounded-md border border-white/[0.08] px-2 py-1 font-mono text-[10px] text-gray-400 sm:block">
                MEIO
              </span>
            </div>

            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Campeões da conta</p>
            <div className="mt-2 space-y-2">
              {CHAMPIONS.map((champion) => (
                <div key={champion.name} className="flex items-center gap-3">
                  <span className="w-16 flex-shrink-0 truncate text-[11.5px] text-gray-300">{champion.name}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className={`block h-full rounded-full transition-[width] duration-700 ease-out ${champion.tone}`}
                      style={{ width: bars ? `${champion.games * 2}%` : "0%" }}
                    />
                  </span>
                  <span className="w-12 flex-shrink-0 text-right font-mono text-[10.5px] tabular-nums text-gray-500">
                    {champion.games} jogos
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`mt-4 flex gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-3 transition-all duration-500 ${
              suggestion ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <Ban className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <span className="min-w-0">
              <span className="block text-[12px] font-black text-white">Ban sugerido: Yasuo</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-gray-400">
                É o campeão mais jogado do time e o que mais fecha partida. Tirando ele, o meio cai para o segundo pick,
                que ganha bem menos.
              </span>
            </span>
          </div>

          {searching && <p className="mt-3 text-[11px] text-violet-300">Procurando o time do Clash...</p>}
        </div>
      </Frame>
    </div>
  )
}

export function RiftToolsStory() {
  return (
    <StorySection
      id="rift"
      eyebrow="Rift Tools"
      title="Entre no Clash sabendo o que o outro time"
      highlight="vai jogar."
      description="Digite o nick de qualquer jogador e o scout monta o time inteiro do Clash, com campeões, desempenho recente e uma leitura de IA que explica o que vale tirar no ban."
      accent="violet"
      reverse
      media={<ScoutCard />}
      points={[
        {
          icon: UserSearch,
          title: "O time adversário inteiro",
          text: "A partir de um nick, o scout puxa os cinco, os campeões de cada um e como vêm jogando.",
        },
        {
          icon: Brain,
          title: "Sugestão de ban com motivo",
          text: "A IA lê os números e escreve por que aquele ban dói mais, em vez de cuspir uma lista solta.",
        },
        {
          icon: ShieldCheck,
          title: "Conta da Riot verificada",
          text: "Vincule o Discord ao invocador uma vez e o perfil passa a valer em todo o resto da plataforma.",
        },
        {
          icon: Swords,
          title: "Leitura do seu estilo",
          text: "O perfil olha as suas ranqueadas e resume como você joga, sem você precisar abrir planilha nenhuma.",
        },
      ]}
    />
  )
}
