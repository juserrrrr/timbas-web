"use client"

import { Trophy, Users, BarChart3, Zap, Shield, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"

//TODO: Add animations to icons and cards for a more dynamic feel

const features = [
  {
    icon: Trophy,
    title: "Sistema de Ranking",
    description: "Acompanhe o desempenho de cada jogador com um sistema de ranking completo e justo.",
    color: "text-yellow-400",
    glow: "blue", // Added glow color for neon effect
  },
  {
    icon: Users,
    title: "Partidas 5v5",
    description: "Organize times balanceados automaticamente para partidas competitivas equilibradas.",
    color: "text-blue-400",
    glow: "red", // Added glow color for neon effect
  },
  {
    icon: BarChart3,
    title: "Estatísticas Detalhadas",
    description: "Visualize estatísticas completas de vitórias, derrotas e performance individual.",
    color: "text-green-400",
    glow: "blue", // Added glow color for neon effect
  },
  {
    icon: Zap,
    title: "Comandos Rápidos",
    description: "Interface intuitiva com comandos simples para criar e gerenciar partidas rapidamente.",
    color: "text-purple-400",
    glow: "red", // Added glow color for neon effect
  },
  {
    icon: Shield,
    title: "Sistema Anti-Trapaça",
    description: "Proteção contra manipulação de resultados e garantia de partidas justas.",
    color: "text-red-400",
    glow: "blue", // Added glow color for neon effect
  },
  {
    icon: Clock,
    title: "Histórico Completo",
    description: "Acesse o histórico completo de todas as partidas e reveja momentos épicos.",
    color: "text-cyan-400",
    glow: "red", // Added glow color for neon effect
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-balance text-4xl font-bold text-white md:text-5xl ">
            Tudo que você precisa para{" "}
            <span className="bg-gradient-to-r from-blue-500 to-red-500 bg-clip-text text-transparent">dominar</span>
          </h2>
          <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
            Recursos poderosos para transformar suas partidas casuais em competições épicas
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`
                group border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm transition-all 
                hover:border-gray-700 hover:bg-gray-900/80
                ${feature.glow === "blue" 
                  ? "shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]" 
                  : "shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-gray-800 p-3 transition-colors group-hover:bg-gray-700">
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
