"use client"

import Image from "next/image"
import { Eye, MonitorPlay, Radio, Server, Volume2 } from "lucide-react"
import { useSequence } from "../motion"
import { Frame, StorySection } from "../section"

const VIEWERS = [3, 7, 11, 14, 18, 21]

function StreamPreview() {
  const { ref, step } = useSequence(VIEWERS.length, 1300)
  const announced = step >= 2

  return (
    <div ref={ref} className="space-y-3">
      <Frame label="timbas.gg/streams/ranked-comigo" accent="rose">
        <div className="p-3 sm:p-4">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.07] bg-[#07070c]">
            {/* A tela transmitida, sugerida com luz em vez de um print falso. */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(59,130,246,0.28),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(244,63,94,0.24),transparent_55%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.02)_50%)] bg-[length:100%_4px]" />

            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              ao vivo
            </span>

            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
              <Eye className="h-3 w-3" />
              <span className="tabular-nums">{VIEWERS[step]}</span> assistindo
            </span>

            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-black/60 backdrop-blur">
                <Volume2 className="h-3.5 w-3.5 text-gray-300" />
              </span>
              <span className="min-w-0 flex-1 rounded-lg border border-white/[0.12] bg-black/60 px-3 py-1.5 backdrop-blur">
                <span className="block truncate text-[11.5px] font-bold text-white">Ranked comigo, sem pressão</span>
                <span className="block text-[10px] text-gray-400">zK está transmitindo</span>
              </span>
              <span className="hidden rounded-lg border border-white/[0.12] bg-black/60 px-2 py-1.5 font-mono text-[10px] text-gray-300 backdrop-blur sm:block">
                1080p 60
              </span>
            </div>
          </div>
        </div>
      </Frame>

      <div
        className={`flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#1e1f22] px-4 py-3 transition-all duration-500 ${
          announced ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <span className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
          <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="" width={32} height={32} className="object-cover" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-white">Timbas</span>
            <span className="rounded bg-[#5865F2] px-1 py-px text-[8px] font-black text-white">APP</span>
            <span className="font-mono text-[10px] text-gray-600">#geral</span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-gray-400">
            <span className="text-blue-400">@zK</span> abriu uma transmissão. Bora assistir.
          </span>
        </span>
      </div>
    </div>
  )
}

export function LiveStory() {
  return (
    <StorySection
      id="transmissoes"
      eyebrow="Transmissões"
      title="Sua tela na sala, a galera"
      highlight="assistindo."
      description="Quem quer mostrar a partida abre a transmissão direto no navegador. Quem quer assistir entra pelo link, e o canal do Discord recebe o aviso na hora."
      accent="rose"
      media={<StreamPreview />}
      points={[
        {
          icon: MonitorPlay,
          title: "Sem programa, sem chave de stream",
          text: "Escolhe a janela, aperta transmitir e pronto. Funciona no navegador que você já tem aberto.",
        },
        {
          icon: Server,
          title: "Ponto a ponto ou pelo servidor",
          text: "Com o servidor de transmissão ligado, sobe uma cópia só do vídeo e a sala aguenta muito mais gente.",
        },
        {
          icon: Radio,
          title: "O canal fica sabendo sozinho",
          text: "O bot anuncia no canal escolhido, marca quem começou e manda o link para assistir.",
        },
        {
          icon: Eye,
          title: "O painel mostra o que está no ar",
          text: "Quem transmite, quem assiste e a qualidade que está chegando no servidor de mídia.",
        },
      ]}
    />
  )
}
