"use client"

import { Users, Crown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TeamsPage() {
  const teams = [
    {
      id: 1,
      name: "Team Alpha",
      tag: "ALPH",
      members: 5,
      wins: 24,
      losses: 16,
      winRate: 60,
      captain: "ProGamer",
      color: "from-blue-600 to-blue-700",
    },
    {
      id: 2,
      name: "Red Dragons",
      tag: "DRAG",
      members: 5,
      wins: 18,
      losses: 12,
      winRate: 60,
      captain: "DragonSlayer",
      color: "from-red-600 to-red-700",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Meus Times</h1>
          <p className="text-gray-400">Gerencie seus times e membros</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          <Users className="mr-2 h-4 w-4" />
          Criar Time
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((team) => (
          <Card
            key={team.id}
            className="border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-sm transition-all hover:border-gray-700"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${team.color} shadow-lg`}
                >
                  <span className="text-2xl font-bold text-white">{team.tag}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{team.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="h-4 w-4" />
                    {team.members} membros
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-black/30 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{team.wins}</p>
                <p className="text-xs text-gray-500">Vitórias</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{team.losses}</p>
                <p className="text-xs text-gray-500">Derrotas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{team.winRate}%</p>
                <p className="text-xs text-gray-500">Win Rate</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-800/50 pt-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-400">Capitão: {team.captain}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                Ver Detalhes
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
