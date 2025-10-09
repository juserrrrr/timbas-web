import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  return (
    <section id="about" className="relative py-24">
      <div className="container mx-auto px-4 cursor-default">
        <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-blue-900/20 to-red-900/20 p-12 backdrop-blur-sm md:p-16">
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-balance text-4xl font-bold text-white md:text-5xl">
              Pronto para elevar suas partidas ao próximo nível?
            </h2>
            <p className="mb-8 text-balance text-lg text-gray-300">
              Junte-se a milhares de jogadores que já estão usando o TimbasBot para organizar partidas épicas e
              competitivas.
            </p>
            <Button size="lg" asChild className="group h-14 bg-blue-600 px-10 text-lg font-semibold hover:bg-blue-700">
              <Link href="/login">
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Decorative elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
        </div>
      </div>
    </section>
  )
}
