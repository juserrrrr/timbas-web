"use client"

import Image from "next/image"
import { useSequence } from "./motion"

const BLUE = ["zK", "Pudim", "Careca", "Mavs", "Bagre"]
const RED = ["Tio Rick", "Duda", "Léo", "Rafa", "Neto"]

/// Ordem em que a galera confirma presença, alternando os lados para o embed
/// encher por igual.
const JOIN_ORDER = [0, 5, 1, 6, 2, 7, 3, 8, 4, 9]

const STEPS = 16

/// O lobby de verdade do bot, refeito em HTML para poder acontecer na tela: a
/// galera entra, o sorteio roda e a partida começa, em looping.
export function DiscordLobby() {
  const { ref, step } = useSequence(STEPS, 620)

  const confirmed = Math.min(step, 10)
  const drawing = step === 11
  const sorted = step >= 12
  const started = step >= 14

  const joined = new Set(JOIN_ORDER.slice(0, confirmed))
  const slot = (index: number, name: string) => {
    if (!joined.has(index)) return "Vazio"
    return name
  }

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#1e1f22] shadow-2xl shadow-black/60">
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-[#1a1b1e] px-4 py-3">
        <span className="h-6 w-6 overflow-hidden rounded-full ring-1 ring-white/10">
          <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="" width={24} height={24} className="object-cover" />
        </span>
        <span className="text-[13px] font-bold text-white">Timbas</span>
        <span className="rounded bg-[#5865F2] px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white">APP</span>
        <span className="ml-auto font-mono text-[10px] text-gray-600">#timbas-queue</span>
      </div>

      <div className="relative px-3 py-4 sm:px-4">
        <div className="rounded-r border-l-[3px] border-blue-500 bg-[#2b2d31] px-3 py-3 sm:px-4">
          <pre
            className={`overflow-x-auto font-mono text-[10.5px] leading-[1.9] text-gray-300 transition-[filter,opacity] duration-200 sm:text-[12px] ${
              drawing ? "opacity-60 blur-[1.5px]" : ""
            }`}
          >
            <span className="block text-center text-gray-500">-----        -*-        -----</span>
            <span className="block text-center font-bold text-white">Partida personalizada ⚔️</span>
            <span className="block text-center text-gray-400">[League of Legends] - Summoner&apos;s Rift</span>
            <span className="mt-2 flex justify-between text-gray-400">
              <span>Fmt: Aleatório</span>
              <span>Modo: Online</span>
            </span>
            <span className="mt-1 grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center font-bold">
              <span className="truncate text-blue-400">TimeAzul</span>
              <span className="text-center text-gray-600">&lt; EQP &gt;</span>
              <span className="truncate text-right text-red-400">TimeVermelho</span>
            </span>
            {BLUE.map((blueName, index) => {
              const left = slot(index, blueName)
              const right = slot(index + 5, RED[index])
              return (
                <span key={blueName} className="grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center">
                  <span
                    className={`truncate transition-colors duration-300 ${
                      left === "Vazio" ? "text-gray-600" : sorted ? "text-blue-300" : "text-gray-200"
                    }`}
                  >
                    {left}
                  </span>
                  <span className="text-center text-gray-700">&lt; VS &gt;</span>
                  <span
                    className={`truncate text-right transition-colors duration-300 ${
                      right === "Vazio" ? "text-gray-600" : sorted ? "text-red-300" : "text-gray-200"
                    }`}
                  >
                    {right}
                  </span>
                </span>
              )
            })}
          </pre>

          <p className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
            {started ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Partida em andamento, boa sorte.
              </>
            ) : sorted ? (
              "Times sorteados. Pode iniciar."
            ) : drawing ? (
              "Sorteando os times..."
            ) : (
              "Aguardando jogadores..."
            )}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <LobbyButton tone="green" active={confirmed < 10}>
            ✅ Entrar
          </LobbyButton>
          <LobbyButton tone="red">🚪 Sair</LobbyButton>
          <LobbyButton tone="gray">
            Confirmados: <span className="tabular-nums">{confirmed}/10</span>
          </LobbyButton>
          <LobbyButton tone="purple" active={confirmed === 10 && !sorted}>
            🎲 Sortear
          </LobbyButton>
          <LobbyButton tone="green" active={sorted && !started}>
            ▶️ Iniciar
          </LobbyButton>
        </div>
      </div>
    </div>
  )
}

function LobbyButton({
  tone,
  active = false,
  children,
}: {
  tone: "green" | "red" | "gray" | "purple"
  active?: boolean
  children: React.ReactNode
}) {
  const tones = {
    green: "border-green-600/40 bg-green-600/15 text-green-300",
    red: "border-red-600/40 bg-red-600/15 text-red-300",
    gray: "border-white/[0.08] bg-white/[0.04] text-gray-400",
    purple: "border-[#5865F2]/40 bg-[#5865F2]/15 text-indigo-300",
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-all duration-300 ${tones[tone]} ${
        active ? "scale-[1.03] shadow-lg shadow-black/40 ring-1 ring-white/20" : ""
      }`}
    >
      {children}
    </span>
  )
}
