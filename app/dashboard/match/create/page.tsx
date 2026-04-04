"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Swords, Shuffle, ChevronRight } from "lucide-react"
import { getToken } from "@/lib/auth"
import { createOnlineMatch } from "@/lib/services/match"
import { useServer } from "@/lib/server-context"

const SIZE_OPTIONS = [
  { value: 1, label: "1v1", desc: "Duelo rápido entre dois jogadores" },
  { value: 3, label: "3v3", desc: "Partida equilibrada em trio" },
  { value: 5, label: "5v5", desc: "Partida completa de League of Legends" },
]

const FORMAT_OPTIONS = [
  { value: "ALEATORIO", label: "Aleatório", desc: "Times sorteados automaticamente" },
  { value: "LIVRE", label: "Livre", desc: "Jogadores escolhem os lados" },
  { value: "ALEATORIO_COMPLETO", label: "Aleatório Completo", desc: "Times e lanes sorteados (só 5v5)" },
]

export default function CreateMatchPage() {
  const router = useRouter()
  const token = getToken()
  const { selectedServer } = useServer()

  const [size, setSize] = useState(5)
  const [format, setFormat] = useState("ALEATORIO")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!token || !selectedServer) return
    if (format === "ALEATORIO_COMPLETO" && size !== 5) {
      setError("Aleatório Completo só está disponível para 5v5.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const match = await createOnlineMatch(token, {
        discordServerId: selectedServer,
        matchFormat: format,
        playersPerTeam: size,
      })
      router.push(`/dashboard/match/${match.id}`)
    } catch (e: any) {
      setError(e.message || "Erro ao criar partida")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Nova Partida</h1>
        <p className="mt-1 text-sm text-gray-500">Configure e crie uma partida online. O embed será enviado automaticamente para o canal do Discord.</p>
      </div>

      {/* Size */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
          <Swords className="h-4 w-4 text-red-400" /> Tamanho da partida
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSize(opt.value)
                if (opt.value !== 5 && format === "ALEATORIO_COMPLETO") setFormat("ALEATORIO")
              }}
              className={`cursor-pointer rounded-xl border p-4 text-center transition-all ${
                size === opt.value
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : "border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/[0.12] hover:text-white"
              }`}
            >
              <div className="text-2xl font-black">{opt.label}</div>
              <div className="mt-1 text-xs text-gray-500">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
          <Shuffle className="h-4 w-4 text-purple-400" /> Formato dos times
        </h2>
        <div className="flex flex-col gap-2">
          {FORMAT_OPTIONS.map((opt) => {
            const disabled = opt.value === "ALEATORIO_COMPLETO" && size !== 5
            return (
              <button
                key={opt.value}
                onClick={() => !disabled && setFormat(opt.value)}
                disabled={disabled}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  disabled
                    ? "cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-40"
                    : format === opt.value
                      ? "cursor-pointer border-purple-500/40 bg-purple-500/10 text-purple-300"
                      : "cursor-pointer border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/[0.12] hover:text-white"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
                {format === opt.value && !disabled && (
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 py-4 text-base font-bold text-blue-300 transition-all hover:border-blue-500/50 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-blue-400" />
        ) : (
          <>
            Criar Partida {size}v{size}
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-600">
        O embed será enviado automaticamente para o canal <span className="text-gray-400">custom_game</span> no Discord selecionado.
      </p>
    </div>
  )
}
