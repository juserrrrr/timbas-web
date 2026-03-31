import { Megaphone, LogIn, Shuffle, Play } from "lucide-react"

const steps = [
  {
    icon: Megaphone,
    number: "01",
    title: "Anunciar",
    description: "O organizador cria a sala de espera com /criarperson. O bot posta o embed com os botões de ação.",
    color: "text-blue-400",
    glow: "bg-blue-500",
    border: "border-blue-500/20",
    bg: "bg-blue-500/[0.08]",
  },
  {
    icon: LogIn,
    number: "02",
    title: "Entrar",
    description: "Os jogadores clicam em Entrar para confirmar presença. O bot exibe os confirmados em tempo real.",
    color: "text-purple-400",
    glow: "bg-purple-500",
    border: "border-purple-500/20",
    bg: "bg-purple-500/[0.08]",
  },
  {
    icon: Shuffle,
    number: "03",
    title: "Sortear",
    description: "Com 10 confirmados, o organizador clica em Sortear. Times são formados automaticamente.",
    color: "text-yellow-400",
    glow: "bg-yellow-500",
    border: "border-yellow-500/20",
    bg: "bg-yellow-500/[0.08]",
  },
  {
    icon: Play,
    number: "04",
    title: "Iniciar",
    description: "A partida começa e é registrada. Resultado, ranking e stats são atualizados automaticamente.",
    color: "text-green-400",
    glow: "bg-green-500",
    border: "border-green-500/20",
    bg: "bg-green-500/[0.08]",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28">
      {/* Section fade top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-gray-400">
            Como funciona
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Do anúncio ao{" "}
            <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              ranking
            </span>
            {" "}em 4 passos
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-500">
            Tudo acontece dentro do Discord — sem apps externos, sem cadastro.
          </p>
        </div>

        <div className="relative grid gap-4 lg:grid-cols-4">

          {steps.map((step, i) => (
            <div
              key={i}
              className={`relative flex flex-col rounded-2xl border ${step.border} ${step.bg} p-6 transition-all duration-300 hover:bg-white/[0.04]`}
            >
              {/* Number badge */}
              <div className="relative mb-6 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${step.border} bg-black/40 relative z-10`}>
                  <step.icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <span className={`text-xs font-bold tracking-widest ${step.color} opacity-60`}>{step.number}</span>
              </div>

              <h3 className="mb-2 text-lg font-bold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>

              {/* Step number watermark */}
              <div className={`absolute right-4 top-4 text-6xl font-black opacity-[0.04] ${step.color} select-none`}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
