"use client"

import { Card } from "@/components/ui/card"
import { Terminal, Copy, Check } from "lucide-react"
import { useState } from "react"

const commands = [
  {
    command: "/criarperson",
    description: "Cria um novo personagem/jogador no sistema",
    example: "/criarperson @usuario nick: ProPlayer",
  },
  {
    command: "/puxartodos",
    description: "Puxa todos os jogadores disponíveis para a partida",
    example: "/puxartodos",
  },
  {
    command: "/anunciar",
    description: "Anuncia uma nova partida para todos os membros",
    example: "/anunciar mensagem: Partida em 10 minutos!",
  },
  {
    command: "/criarpartida",
    description: "Inicia uma nova partida 5v5 com times balanceados",
    example: "/criarpartida modo: ranqueada",
  },
  {
    command: "/ranking",
    description: "Exibe o ranking atual dos jogadores",
    example: "/ranking top: 10",
  },
  {
    command: "/stats",
    description: "Mostra as estatísticas detalhadas de um jogador",
    example: "/stats @usuario",
  },
]

export function CommandsSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = async (command: string, index: number) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopiedIndex(index)
      setTimeout(() => {
        setCopiedIndex(null)
      }, 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <section id="commands" className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-balance text-4xl font-bold text-white md:text-5xl">
            Comandos{" "}
            <span className="bg-gradient-to-r from-blue-500 to-red-500 bg-clip-text text-transparent">Poderosos</span>
          </h2>
          <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
            Interface simples e intuitiva com comandos slash do Discord
          </p>
        </div>

        <div className="mx-auto max-w-4xl space-y-4">
          {commands.map((cmd, index) => (
            <Card
              key={index}
              className="group border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-gray-900/80"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-blue-400" />
                    <code className="text-lg font-semibold text-blue-400">{cmd.command}</code>
                  </div>
                  <p className="mb-2 text-sm text-gray-300">{cmd.description}</p>
                  <code className="text-xs text-gray-500">{cmd.example}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(cmd.command, index)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 transition-all hover:border-blue-500/50 hover:bg-gray-800"
                  aria-label="Copiar comando"
                >
                  {copiedIndex === index ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
