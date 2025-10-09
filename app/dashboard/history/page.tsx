"use client"

import { Calendar, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HistoryPage() {
  const matches = [
    {
      id: 1,
      number: 1,
      date: "2024-01-15",
      time: "20:30",
      server: "Servidor Principal",
      winner: "blue",
      blueTeam: [
        { name: "ProGamer", kills: 12, deaths: 5, assists: 8 },
        { name: "ShadowNinja", kills: 10, deaths: 6, assists: 10 },
        { name: "ThunderStrike", kills: 8, deaths: 7, assists: 12 },
        { name: "IceQueen", kills: 6, deaths: 8, assists: 15 },
        { name: "FireDragon", kills: 9, deaths: 6, assists: 9 },
      ],
      redTeam: [
        { name: "DarkKnight", kills: 7, deaths: 9, assists: 8 },
        { name: "StormBreaker", kills: 8, deaths: 8, assists: 7 },
        { name: "NightHunter", kills: 6, deaths: 10, assists: 9 },
        { name: "CrimsonBlade", kills: 5, deaths: 9, assists: 10 },
        { name: "PhantomAssassin", kills: 6, deaths: 9, assists: 8 },
      ],
      duration: "35:42",
    },
    {
      id: 2,
      number: 2,
      date: "2024-01-14",
      time: "19:15",
      server: "Servidor Principal",
      winner: "red",
      blueTeam: [
        { name: "MysticMage", kills: 5, deaths: 10, assists: 7 },
        { name: "SteelWarrior", kills: 6, deaths: 9, assists: 8 },
        { name: "SwiftArcher", kills: 7, deaths: 8, assists: 6 },
        { name: "HolyPriest", kills: 3, deaths: 11, assists: 12 },
        { name: "BattleTank", kills: 4, deaths: 10, assists: 9 },
      ],
      redTeam: [
        { name: "VenomSnake", kills: 11, deaths: 5, assists: 9 },
        { name: "BloodHunter", kills: 10, deaths: 6, assists: 10 },
        { name: "SilentKiller", kills: 9, deaths: 5, assists: 11 },
        { name: "RogueAssassin", kills: 8, deaths: 6, assists: 8 },
        { name: "DeathBringer", kills: 10, deaths: 3, assists: 7 },
      ],
      duration: "42:18",
    },
    {
      id: 3,
      number: 3,
      date: "2024-01-13",
      time: "21:00",
      server: "Servidor Secundário",
      winner: "blue",
      blueTeam: [
        { name: "LightningBolt", kills: 14, deaths: 4, assists: 10 },
        { name: "FrostMage", kills: 11, deaths: 5, assists: 12 },
        { name: "WindRanger", kills: 9, deaths: 6, assists: 14 },
        { name: "EarthShaker", kills: 7, deaths: 7, assists: 16 },
        { name: "WaterSpirit", kills: 8, deaths: 6, assists: 13 },
      ],
      redTeam: [
        { name: "InfernoKnight", kills: 6, deaths: 10, assists: 7 },
        { name: "ShadowDemon", kills: 7, deaths: 9, assists: 8 },
        { name: "ChaosWarrior", kills: 5, deaths: 11, assists: 9 },
        { name: "VoidWalker", kills: 6, deaths: 10, assists: 6 },
        { name: "DoomBringer", kills: 4, deaths: 9, assists: 8 },
      ],
      duration: "28:35",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Histórico de Partidas</h1>
        <p className="text-gray-400">Veja todas as partidas jogadas e seus resultados</p>
      </div>

      <div className="space-y-4">
        {matches.map((match) => (
          <Card
            key={match.id}
            className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm"
          >
            {/* Match Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/50 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-red-600/20 border border-gray-700">
                  <span className="text-xl font-bold text-white">#{match.number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Partida {match.number}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {match.date} às {match.time}
                    </span>
                    <span>•</span>
                    <span>{match.duration}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="border-gray-700 text-gray-300">
                {match.server}
              </Badge>
            </div>

            {/* Teams Display */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Blue Team */}
              <div
                className={`rounded-lg border p-4 ${
                  match.winner === "blue" ? "border-blue-500/50 bg-blue-500/5" : "border-gray-800/50 bg-gray-900/30"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <h4 className="font-bold text-blue-400">Time Azul</h4>
                  </div>
                  {match.winner === "blue" && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      <Trophy className="mr-1 h-3 w-3" />
                      Vitória
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {match.blueTeam.map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-white">{player.name}</span>
                      <span className="text-gray-400">
                        {player.kills}/{player.deaths}/{player.assists}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Red Team */}
              <div
                className={`rounded-lg border p-4 ${
                  match.winner === "red" ? "border-red-500/50 bg-red-500/5" : "border-gray-800/50 bg-gray-900/30"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <h4 className="font-bold text-red-400">Time Vermelho</h4>
                  </div>
                  {match.winner === "red" && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                      <Trophy className="mr-1 h-3 w-3" />
                      Vitória
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {match.redTeam.map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-white">{player.name}</span>
                      <span className="text-gray-400">
                        {player.kills}/{player.deaths}/{player.assists}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
