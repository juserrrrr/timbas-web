"use client"

import { TrendingUp, Target, Award, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function StatsPage() {
  const stats = [
    { label: "Total de Partidas", value: "156", icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Taxa de Vitória", value: "58%", icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "KDA Médio", value: "3.2", icon: Award, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Sequência Atual", value: "5W", icon: Zap, color: "text-red-400", bg: "bg-red-500/10" },
  ]

  const recentPerformance = [
    { week: "Semana 1", wins: 12, losses: 8 },
    { week: "Semana 2", wins: 15, losses: 5 },
    { week: "Semana 3", wins: 10, losses: 10 },
    { week: "Semana 4", wins: 18, losses: 2 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Estatísticas</h1>
        <p className="text-gray-400">Acompanhe seu desempenho e progresso</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`rounded-xl ${stat.bg} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
        <h2 className="mb-6 text-xl font-bold text-white">Desempenho Recente</h2>
        <div className="space-y-4">
          {recentPerformance.map((week, index) => {
            const total = week.wins + week.losses
            const winPercentage = (week.wins / total) * 100

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{week.week}</span>
                  <span className="text-white">
                    {week.wins}V - {week.losses}D
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                    style={{ width: `${winPercentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-bold text-white">Campeões Mais Jogados</h2>
          <div className="space-y-3">
            {["Yasuo", "Zed", "Lee Sin", "Thresh", "Jinx"].map((champion, index) => (
              <div key={champion} className="flex items-center justify-between rounded-lg bg-black/30 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                  <span className="text-white">{champion}</span>
                </div>
                <span className="text-sm text-blue-400">{Math.floor(Math.random() * 30 + 10)} partidas</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-bold text-white">Conquistas Recentes</h2>
          <div className="space-y-3">
            {[
              { title: "Pentakill", desc: "Conseguiu um pentakill", color: "text-yellow-400" },
              { title: "Sequência de 10", desc: "10 vitórias seguidas", color: "text-green-400" },
              { title: "MVP", desc: "MVP em 5 partidas", color: "text-blue-400" },
              { title: "Carry", desc: "Maior dano em 20 partidas", color: "text-red-400" },
            ].map((achievement) => (
              <div key={achievement.title} className="flex items-center gap-3 rounded-lg bg-black/30 p-3">
                <Award className={`h-5 w-5 ${achievement.color}`} />
                <div>
                  <p className={`font-semibold ${achievement.color}`}>{achievement.title}</p>
                  <p className="text-xs text-gray-500">{achievement.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}