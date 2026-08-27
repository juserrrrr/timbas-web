"use client"

import Image from "next/image"
import { Bot, Crown, Medal, MessageSquare, Trophy } from "lucide-react"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const COMMANDS = [
  { name: "/criarpartida", text: "abre a sala 1v1, 3v3 ou 5v5" },
  { name: "/ranking", text: "top 10 do servidor" },
  { name: "/versus", text: "compara dois jogadores" },
  { name: "/dupla", text: "o quanto vocês rendem juntos" },
  { name: "/halldafama", text: "as conquistas da comunidade" },
  { name: "/temporada", text: "abre e encerra a temporada" },
  { name: "/evento", text: "convite com confirmação de presença" },
  { name: "/anunciar", text: "recado para todo o servidor" },
  { name: "/puxartodos", text: "traz a galera para o seu canal" },
  { name: "/usuariolol", text: "vincula o nick da Riot" },
  { name: "/setavatar", text: "troca o avatar do bot" },
  { name: "/apagar", text: "limpa mensagens do canal" },
]

const CANDIDATES = [
  { name: "Pudim", votes: 3 },
  { name: "zK", votes: 1 },
  { name: "Careca", votes: 1 },
  { name: "Mavs", votes: 0 },
  { name: "Bagre", votes: 0 },
]

const TOTAL_VOTES = CANDIDATES.reduce((sum, player) => sum + player.votes, 0)

/// Quantos votos já foram contados antes de cada nome, para os votos entrarem
/// um a um na ordem da lista.
const VOTE_OFFSETS = CANDIDATES.map((_, index) =>
  CANDIDATES.slice(0, index).reduce((sum, player) => sum + player.votes, 0),
)

function MvpVote() {
  const { ref, step } = useSequence(TOTAL_VOTES + 3, 900)
  const revealed = Math.min(step, TOTAL_VOTES)
  const closed = step >= TOTAL_VOTES + 2

  const votesOf = (index: number) =>
    Math.max(0, Math.min(CANDIDATES[index].votes, revealed - VOTE_OFFSETS[index]))

  return (
    <div ref={ref} className="space-y-3">
      <Frame label="discord · mensagem direta do Timbas" accent="indigo">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
              <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="" width={32} height={32} className="object-cover" />
            </span>
            <span>
              <span className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-bold text-white">Timbas</span>
                <span className="rounded bg-[#5865F2] px-1 py-px text-[8px] font-black text-white">APP</span>
              </span>
              <span className="block text-[10.5px] text-gray-600">acabou a partida #143</span>
            </span>
          </div>

          <p className="mt-3 text-[13px] font-bold text-white">Quem foi o MVP da partida?</p>
          <p className="text-[11px] text-gray-500">Só quem venceu aparece na cédula. A votação fecha em 90 segundos.</p>

          <ul className="mt-3 space-y-1.5">
            {CANDIDATES.map((player, index) => {
              const votes = votesOf(index)
              const winner = closed && player.name === "Pudim"
              return (
                <li
                  key={player.name}
                  className={`relative overflow-hidden rounded-lg border px-3 py-2 transition-colors duration-500 ${
                    winner ? "border-indigo-400/40 bg-indigo-400/[0.12]" : "border-white/[0.07] bg-black/25"
                  }`}
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-indigo-500/15 transition-[width] duration-500"
                    style={{ width: `${(votes / 3) * 100}%` }}
                  />
                  <span className="relative flex items-center gap-2">
                    <span className="flex-1 truncate text-[12px] font-bold text-gray-200">{player.name}</span>
                    {winner && <Crown className="h-3.5 w-3.5 text-indigo-300" />}
                    <span className="font-mono text-[10.5px] tabular-nums text-gray-500">
                      {votes} {votes === 1 ? "voto" : "votos"}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>

          <div
            className={`mt-3 overflow-hidden transition-all duration-500 ${closed ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <p className="flex items-center gap-2 rounded-lg border border-indigo-400/25 bg-indigo-400/[0.08] px-3 py-2.5 text-[12px] font-bold text-indigo-200">
              <Medal className="h-4 w-4 flex-shrink-0" />
              Pudim levou o MVP e mais uma conquista para o hall da fama.
            </p>
          </div>
        </div>
      </Frame>
    </div>
  )
}

function CommandMarquee() {
  const loop = [...COMMANDS, ...COMMANDS]

  return (
    <div className="lp-marquee-host relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#050508] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#050508] to-transparent" />
      <div className="lp-marquee flex w-max gap-2" style={{ "--marquee-duration": "42s" } as React.CSSProperties}>
        {loop.map((command, index) => (
          <span
            key={`${command.name}-${index}`}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5"
          >
            <span className="font-mono text-[12px] font-bold text-indigo-300">{command.name}</span>
            <span className="text-[11px] text-gray-500">{command.text}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function DiscordBotStory() {
  return (
    <>
      <StorySection
        id="bot"
        eyebrow="Bot no Discord"
        title="O bot cuida do resto"
        highlight="sem ninguém sair do chat."
        description="Doze comandos para o dia a dia do servidor, votação de MVP na mensagem direta depois que a partida acaba e um resumo que fecha a noite. A temporada aberta filtra o ranking no bot e no site ao mesmo tempo."
        accent="indigo"
        media={<MvpVote />}
        points={[
          {
            icon: Bot,
            title: "Doze comandos, zero configuração",
            text: "De criar a partida a limpar o canal, tudo na interface nativa de comando do Discord.",
          },
          {
            icon: Trophy,
            title: "MVP votado por quem jogou",
            text: "Assim que a partida encerra, quem venceu recebe a cédula na DM e escolhe o melhor em campo.",
          },
          {
            icon: MessageSquare,
            title: "Recap e conquistas",
            text: "O bot fecha a partida com um resumo e registra as conquistas no hall da fama do servidor.",
          },
          {
            icon: Crown,
            title: "Temporada com começo e fim",
            text: "Abriu temporada, o ranking passa a contar dali para frente. Encerrou, o campeão fica gravado.",
          },
        ]}
      />

      {/* A lista inteira de comandos passando de lado, do jeito que ela aparece
          no autocomplete do Discord. */}
      <div className="pb-20 sm:pb-28">
        <CommandMarquee />
      </div>
    </>
  )
}
