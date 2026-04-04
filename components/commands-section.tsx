"use client"

import { Terminal, Copy, Check } from "lucide-react"
import { useState } from "react"

const commands = [
  {
    command: "/criarpartida",
    description: "Cria uma partida Online (com registro) ou Offline — escolha o tamanho (1v1/3v3/5v5) e o formato (Aleatório, Livre ou Aleatório Completo).",
    example: "/criarpartida modo: Online tamanho: 5v5 formato: Aleatório",
    badge: "Partidas",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  },
  {
    command: "/ranking",
    description: "Mostra o ranking dos 10 melhores jogadores do servidor.",
    example: "/ranking",
    badge: "Stats",
    badgeColor: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  },
  {
    command: "/versus",
    description: "Compara as estatísticas de dois jogadores do servidor lado a lado.",
    example: "/versus jogador1: @TimbasBot jogador2: @Amigo",
    badge: "Stats",
    badgeColor: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  },
  {
    command: "/puxartodos",
    description: "Move todos os usuários de outros canais de voz para o seu canal atual.",
    example: "/puxartodos",
    badge: "Utilidade",
    badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  },
  {
    command: "/anunciar",
    description: "Encaminha um anúncio com @everyone para o canal onde o comando foi executado.",
    example: "/anunciar mensagem: Partida em 10 minutos!",
    badge: "Utilidade",
    badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  },
  {
    command: "/evento",
    description: "Cria um convite de evento com botão de confirmação de presença.",
    example: "/evento",
    badge: "Utilidade",
    badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  },
]

export function CommandsSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = async (command: string, index: number) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // silent
    }
  }

  return (
    <section id="commands" className="relative py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-gray-400">
            Comandos
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Slash Commands{" "}
            <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              poderosos
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-500">
            Interface nativa do Discord — sem sair do servidor para nada.
          </p>
        </div>

        {/* Terminal window */}
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-[#0d0d12] overflow-hidden shadow-2xl shadow-black/40">
          {/* Terminal header */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#0a0a0f] px-5 py-3.5">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Terminal className="h-3.5 w-3.5" />
              <span>TimbasBot — Discord Commands</span>
            </div>
          </div>

          {/* Commands list */}
          <div className="divide-y divide-white/[0.04]">
            {commands.map((cmd, index) => (
              <div
                key={index}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <code className="text-sm font-bold text-blue-400">{cmd.command}</code>
                    <span className={`hidden sm:inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${cmd.badgeColor}`}>
                      {cmd.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{cmd.description}</p>
                  <code className="mt-1 block text-xs text-gray-600">{cmd.example}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(cmd.command, index)}
                  className="flex h-9 w-9 cursor-pointer flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.08] hover:border-white/20"
                  aria-label="Copiar comando"
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
