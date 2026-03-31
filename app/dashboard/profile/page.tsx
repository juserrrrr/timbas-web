"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { User, Mail, Hash } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { getToken, decodeToken, TokenPayload } from "@/lib/auth"
import { getRanking, PlayerStats } from "@/lib/services/ranking"

const DEFAULT_SERVER = "779382528821166100"

export default function ProfilePage() {
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken()
        if (!token) return
        const decoded = decodeToken(token)
        if (!decoded) return
        setPayload(decoded)
        const ranking = await getRanking(token, DEFAULT_SERVER)
        const uid = Number(decoded.sub)
        const myStats = ranking.find((p) => p.userId === uid) ?? null
        setStats(myStats)
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="size-8 text-blue-500" />
      </div>
    )
  }

  const initials = payload?.name
    ? payload.name.slice(0, 2).toUpperCase()
    : "?"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
        <p className="text-gray-400">Suas informações pessoais</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm lg:col-span-1">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-gray-700/50 ring-4 ring-blue-500/20">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-4xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{payload?.name ?? "—"}</h2>
              {stats && (
                <p className="text-sm text-gray-400">Rank #{stats.rank}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Informações Pessoais</h2>
              <p className="text-sm text-gray-400">Dados vinculados à sua conta</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-white">
                <User className="h-4 w-4 text-gray-400" />
                Nome de Usuário
              </Label>
              <Input
                id="name"
                value={payload?.name ?? ""}
                disabled
                className="border-gray-700 bg-gray-800/50 text-white disabled:opacity-70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-white">
                <Mail className="h-4 w-4 text-gray-400" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={payload?.email ?? ""}
                disabled
                className="border-gray-700 bg-gray-800/50 text-white disabled:opacity-70"
              />
              <p className="text-xs text-gray-500">Email vinculado ao Discord (não editável)</p>
            </div>

            {stats?.discordId && (
              <div className="space-y-2">
                <Label htmlFor="discordId" className="flex items-center gap-2 text-white">
                  <Hash className="h-4 w-4 text-gray-400" />
                  Discord ID
                </Label>
                <Input
                  id="discordId"
                  value={stats.discordId}
                  disabled
                  className="border-gray-700 bg-gray-800/50 text-white disabled:opacity-70"
                />
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-bold text-white">Estatísticas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-800/50 bg-black/30 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats?.totalGames ?? "—"}</p>
            <p className="text-sm text-gray-400">Partidas Jogadas</p>
          </div>
          <div className="rounded-lg border border-gray-800/50 bg-black/30 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats?.wins ?? "—"}</p>
            <p className="text-sm text-gray-400">Vitórias</p>
          </div>
          <div className="rounded-lg border border-gray-800/50 bg-black/30 p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {stats ? `${Math.round(stats.winRate * 100)}%` : "—"}
            </p>
            <p className="text-sm text-gray-400">Taxa de Vitória</p>
          </div>
          <div className="rounded-lg border border-gray-800/50 bg-black/30 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats ? `#${stats.rank}` : "—"}</p>
            <p className="text-sm text-gray-400">Posição no Ranking</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
