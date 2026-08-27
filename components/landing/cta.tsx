"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "./motion"

const PROMISES = ["Entrada pelo Discord", "Sem cadastro novo", "O bot e o site na mesma conta"]

export function LandingCta() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07070c] px-6 py-16 sm:px-12 sm:py-20">
            {/* O fecho da página: as duas metades do escudo se encontrando. */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -left-32 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-blue-600/25 blur-[130px]" />
              <div className="absolute -right-32 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-red-600/20 blur-[130px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff06_1px,_transparent_1px)] bg-[size:26px_26px]" />
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            </div>

            <div className="relative flex flex-col items-center text-center">
              <span className="h-16 w-16 overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
                <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="Timbas" width={64} height={64} className="object-cover" />
              </span>

              <h2 className="font-display mt-8 max-w-3xl text-[clamp(2.2rem,5vw,3.6rem)] text-white">
                Chama a galera. O resto{" "}
                <span className="bg-gradient-to-r from-blue-400 via-white to-red-400 bg-clip-text text-transparent">
                  a plataforma resolve.
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-400">
                Entre com a conta do Discord que você já usa. A partida de hoje, o campeonato do mês e a temporada
                inteira ficam guardados no mesmo lugar.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="group h-12 bg-blue-600 px-8 text-[15px] font-bold shadow-xl shadow-blue-600/25 hover:bg-blue-500"
                >
                  <Link href="/dashboard">
                    Entrar com Discord
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/10 bg-white/[0.04] px-8 text-[15px] font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white"
                >
                  <a href="#tudo">Rever o que tem dentro</a>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[12.5px] text-gray-500">
                {PROMISES.map((promise) => (
                  <span key={promise} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-400 to-red-400" />
                    {promise}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
