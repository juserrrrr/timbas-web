import { Trophy, Users, BarChart3, Zap, Shield, Clock } from "lucide-react"

const features = [
  {
    icon: Trophy,
    title: "Sistema de Ranking",
    description: "Pontuação por vitória, sequências de wins, histórico completo e pódio por servidor.",
    accent: "#eab308",
    from: "from-yellow-500/10",
    border: "border-yellow-500/15",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
    size: "lg",
  },
  {
    icon: Users,
    title: "Partidas 5v5",
    description: "Times criados aleatoriamente, por draft livre ou balanceados por nível.",
    accent: "#3b82f6",
    from: "from-blue-500/10",
    border: "border-blue-500/15",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    size: "sm",
  },
  {
    icon: BarChart3,
    title: "Estatísticas Detalhadas",
    description: "Win rate, lado favorito (Azul/Vermelho), parceiros, adversários e desempenho semanal.",
    accent: "#22c55e",
    from: "from-green-500/10",
    border: "border-green-500/15",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-400",
    size: "sm",
  },
  {
    icon: Zap,
    title: "Comandos Slash",
    description: "Interface nativa do Discord com /criarperson, /criarpartida, /ranking e mais.",
    accent: "#a855f7",
    from: "from-purple-500/10",
    border: "border-purple-500/15",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    size: "sm",
  },
  {
    icon: Shield,
    title: "Multi-Servidor",
    description: "Cada servidor tem seu próprio ranking e histórico. Dados totalmente isolados.",
    accent: "#ef4444",
    from: "from-red-500/10",
    border: "border-red-500/15",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    size: "sm",
  },
  {
    icon: Clock,
    title: "Histórico Completo",
    description: "Reveja todas as partidas, times formados e quem ganhou. Nada se perde.",
    accent: "#06b6d4",
    from: "from-cyan-500/10",
    border: "border-cyan-500/15",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    size: "sm",
  },
]

export function FeaturesSection() {
  const [hero, ...rest] = features

  return (
    <section id="features" className="relative py-28">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-gray-400">
            Features
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Tudo que você precisa para{" "}
            <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              dominar
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-500">
            Recursos poderosos para transformar partidas casuais em competições épicas.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Hero card — spans 1 col full height */}
          <div className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border ${hero.border} bg-gradient-to-b ${hero.from} to-transparent p-7 lg:row-span-2`}>
            <div>
              <div className={`mb-5 inline-flex items-center justify-center rounded-xl ${hero.iconBg} p-3.5`}>
                <hero.icon className={`h-7 w-7 ${hero.iconColor}`} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white">{hero.title}</h3>
              <p className="text-base leading-relaxed text-gray-400">{hero.description}</p>
            </div>

            {/* Decorative rank display */}
            <div className="mt-8 space-y-2">
              {[
                { pos: "1º", name: "GabrielDev", pts: "1.240 pts", color: "text-yellow-400" },
                { pos: "2º", name: "KingstonFPS", pts: "1.080 pts", color: "text-gray-300" },
                { pos: "3º", name: "ZkaMaster", pts: "960 pts", color: "text-amber-600" },
              ].map((p) => (
                <div key={p.pos} className="flex items-center gap-3 rounded-xl bg-black/30 px-4 py-2.5">
                  <span className={`w-6 text-sm font-bold ${p.color}`}>{p.pos}</span>
                  <span className="flex-1 text-sm text-white font-medium">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.pts}</span>
                </div>
              ))}
            </div>

            {/* Glow */}
            <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full opacity-20 blur-3xl" style={{ background: hero.accent }} />
          </div>

          {/* Right 2×2 grid */}
          {rest.map((feature, i) => (
            <div
              key={i}
              className={`group relative overflow-hidden rounded-2xl border ${feature.border} bg-gradient-to-br ${feature.from} to-transparent p-6 transition-all duration-300 hover:bg-white/[0.02]`}
            >
              <div className={`mb-4 inline-flex items-center justify-center rounded-xl ${feature.iconBg} p-3`}>
                <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
              <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full opacity-10 blur-2xl" style={{ background: feature.accent }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
