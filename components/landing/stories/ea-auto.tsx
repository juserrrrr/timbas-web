"use client"

import { Brain, CheckCircle2, Clock, Gamepad2, Loader2, RadioTower, ScanLine, SlidersHorizontal } from "lucide-react"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const STATUS = [
  { icon: Clock, text: "Confronto marcado, esperando vocês jogarem", tone: "text-gray-400" },
  { icon: Loader2, text: "Procurando a partida na EA...", tone: "text-cyan-300" },
  { icon: CheckCircle2, text: "Partida encontrada nos dois clubes", tone: "text-cyan-300" },
  { icon: CheckCircle2, text: "Placar aplicado sem ninguém digitar", tone: "text-emerald-300" },
  { icon: RadioTower, text: "Chave avançada: Timbas FC está na final", tone: "text-amber-300" },
]

function Club({
  name,
  initials,
  score,
  scored,
  mirrored = false,
}: {
  name: string
  initials: string
  score: string
  scored: boolean
  mirrored?: boolean
}) {
  return (
    <div className={`flex items-center gap-2.5 ${mirrored ? "flex-row-reverse text-right" : ""}`}>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] font-black text-gray-300">
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-black text-white">{name}</span>
        <span
          className={`block font-mono text-[22px] font-black leading-tight tabular-nums transition-colors duration-500 ${
            scored ? "text-cyan-300" : "text-gray-700"
          }`}
        >
          {scored ? score : "-"}
        </span>
      </span>
    </div>
  )
}

function EaSync() {
  const { ref, step } = useSequence(STATUS.length, 1500)
  const status = STATUS[step]
  const scanning = step === 1
  const scored = step >= 3

  return (
    <div ref={ref}>
      <Frame label="ea sports fc · sincronização automática" accent="cyan">
        <div className="relative overflow-hidden p-4 sm:p-5">
          {scanning && (
            <span
              aria-hidden
              className="lp-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent"
            />
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-gray-500">Copa Timbas · Semifinal 1</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-400/[0.08] px-2 py-1 text-[10px] font-black text-cyan-300">
              <Gamepad2 className="h-3 w-3" />
              EA FC 26
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-4">
            <Club name="Timbas FC" initials="TF" score="3" scored={scored} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">vs</span>
            <Club name="Vila Nova" initials="VN" score="1" scored={scored} mirrored />
          </div>

          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
            <status.icon className={`h-4 w-4 flex-shrink-0 ${status.tone} ${scanning ? "animate-spin" : ""}`} />
            <span className={`text-[12px] font-bold ${status.tone}`}>{status.text}</span>
          </div>

          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-violet-400/20 bg-violet-400/[0.05] px-3.5 py-3">
            <Brain className="h-4 w-4 flex-shrink-0 text-violet-300" />
            <span className="text-[11.5px] leading-relaxed text-gray-400">
              Se a EA não devolver a partida, o print da tela final entra no lugar e a IA confere o placar antes de
              contabilizar.
            </span>
          </div>

          <p className="mt-3 font-mono text-[10px] leading-relaxed text-gray-600">
            checagem a cada 120s · até 3 confrontos por minuto · aceita a partida até 60 min antes do horário
          </p>
        </div>
      </Frame>
    </div>
  )
}

export function EaAutoStory() {
  return (
    <StorySection
      id="ea"
      eyebrow="EA FC automático"
      title="Vocês jogam no EA FC. O placar chega"
      highlight="sozinho."
      description="A parte chata de campeonato de futebol é cobrar resultado. Aqui o servidor pergunta à EA de tempos em tempos, acha a partida entre os dois clubes, escreve o placar e empurra a chave. Ninguém digita nada."
      accent="cyan"
      media={<EaSync />}
      points={[
        {
          icon: ScanLine,
          title: "Busca sozinho, sem ninguém pedir",
          text: "A partida é procurada nos dois clubes e só entra quando bate com o confronto marcado.",
        },
        {
          icon: Brain,
          title: "A IA cobre o que a EA não devolve",
          text: "Print da tela final enviado no lugar, lido e conferido antes de virar resultado oficial.",
        },
        {
          icon: SlidersHorizontal,
          title: "O ritmo é escolhido no painel",
          text: "Intervalo entre consultas, quantos confrontos por minuto e quanto tempo antes do horário ainda vale.",
        },
        {
          icon: Gamepad2,
          title: "Clube da EA conectado uma vez",
          text: "Depois de conectado, as partidas do clube entram no painel com estatística de jogador e artilharia.",
        },
      ]}
    />
  )
}
