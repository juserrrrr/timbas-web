"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock3, Gamepad2, Users } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getGameCatalog, type GameCatalog } from "@/lib/services/games"

export default function GamesPage() {
  const [catalog, setCatalog] = useState<GameCatalog | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    void getGameCatalog()
      .then(setCatalog)
      .catch(() => setFailed(true))
  }, [])

  return (
    <div className="dashboard-view space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-[linear-gradient(135deg,rgba(244,165,43,0.09),transparent_55%)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-amber-300/70">Jogos</p>
        <h1 className="font-display mt-3 text-4xl uppercase leading-[0.92] tracking-tight text-white sm:text-5xl">
          Escolha um jogo
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Crie uma sala ou entre em uma partida. Tudo roda direto no navegador.
        </p>
      </header>

      {!catalog && !failed && (
        <div className="flex justify-center py-16">
          <Spinner className="size-6 text-amber-300" />
        </div>
      )}

      {failed && (
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] px-5 py-8 text-center text-sm text-zinc-400">
          Não foi possível carregar os jogos agora.
        </div>
      )}

      {catalog && (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {catalog.games.map((game) => {
            return (
              <article
                key={game.id}
                className="group relative flex min-h-80 flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-zinc-950/60 p-6 transition hover:border-amber-400/25 sm:p-7"
              >
                <div className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,rgba(255,255,255,0.02)_0_2px,transparent_2px_9px)]" />
                <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-red-600/[0.08] blur-[90px] transition group-hover:bg-amber-500/[0.08]" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
                      <Gamepad2 className="h-5 w-5" />
                    </span>
                  </div>

                  <p className="mt-7 font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-red-300/75">
                    {game.tagline}
                  </p>
                  <h2 className="font-display mt-2 text-3xl uppercase leading-none tracking-tight text-white">
                    {game.name}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">{game.description}</p>

                  <dl className="mt-6 flex flex-wrap gap-5 border-t border-white/[0.06] pt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-zinc-600" />
                      <dd>{game.players}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-3.5 w-3.5 text-zinc-600" />
                      <dd>{game.minutes}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto pt-7">
                    <Link
                      href={game.href}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300"
                    >
                      Ver salas
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {catalog && catalog.games.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-zinc-500">
          Nenhum jogo disponível agora.
        </div>
      )}
    </div>
  )
}
