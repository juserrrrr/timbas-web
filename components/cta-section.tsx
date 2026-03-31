import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="relative py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-blue-950/50 via-[#050508] to-red-950/40 p-12 md:p-20">
          {/* Blobs */}
          <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-red-600/10 blur-[100px]" />
          {/* Dot grid */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_#ffffff05_1px,_transparent_1px)] bg-[size:24px_24px]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Logo */}
            <div className="mb-8 h-20 w-20 rounded-2xl overflow-hidden shadow-2xl shadow-blue-600/20 ring-1 ring-white/10">
              <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={80} height={80} className="object-cover" />
            </div>

            <h2 className="mb-5 max-w-2xl text-4xl font-black text-white md:text-5xl leading-tight">
              Pronto para elevar suas partidas ao{" "}
              <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
                próximo nível?
              </span>
            </h2>

            <p className="mb-10 max-w-lg text-lg text-gray-400">
              Junte-se à comunidade que já usa o TimbasBot para organizar partidas épicas e acompanhar a evolução de cada jogador.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                size="lg"
                asChild
                className="group h-13 bg-blue-600 px-10 text-base font-semibold hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all"
              >
                <Link href="/login">
                  Entrar com Discord
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="h-13 px-8 text-gray-400 hover:text-white hover:bg-white/[0.05]"
              >
                <a href="#features">Ver Features</a>
              </Button>
            </div>

            {/* Trust */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              {["Gratuito para usar", "Sem cadastro extra", "Login pelo Discord"].map((t, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500/60" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
