"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return
      const scrolled = window.scrollY
      const parallaxElements = sectionRef.current.querySelectorAll("[data-parallax]")

      parallaxElements.forEach((el) => {
        const speed = Number.parseFloat(el.getAttribute("data-parallax") || "0")
        const yPos = -(scrolled * speed)
        ;(el as HTMLElement).style.transform = `translateY(${yPos}px)`
      })
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section ref={sectionRef} className="relative min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center">
          {/* Announcement badge */}
          <div
            data-parallax="0.1"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-blue-300">Novo sistema de ranking disponível</span>
          </div>

          {/* Main headline */}
          <h1
            data-parallax="0.05"
            className="mb-6 text-balance text-6xl font-bold leading-tight tracking-tight text-white md:text-7xl lg:text-8xl"
          >
            Organize partidas{" "}
            <span className="bg-gradient-to-r from-blue-500 to-red-500 bg-clip-text text-transparent">épicas</span> com
            seus amigos
          </h1>

          {/* Subtitle */}
          <p
            data-parallax="0.08"
            className="mx-auto mb-10 max-w-2xl text-balance text-lg leading-relaxed text-gray-400 md:text-xl"
          >
            TimbasBot é o bot de Discord definitivo para criar e gerenciar partidas competitivas 5v5. Sistema de
            ranking, estatísticas detalhadas e muito mais.
          </p>

          {/* CTA Buttons */}
          <div data-parallax="0.12" className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="group h-12 bg-blue-600 px-8 text-base font-semibold hover:bg-blue-700">
              <Link href="/login">
                Acessar Dashboard
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 border-gray-700 bg-transparent px-8 text-base font-semibold hover:bg-gray-900"
            >
              <Link href="#commands">Ver Comandos</Link>
            </Button>
          </div>

          {/* Stats */}
          <div data-parallax="0.15" className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 md:gap-12">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="mb-2 text-4xl font-bold text-blue-400">10K+</div>
              <div className="text-sm text-gray-400">Partidas Organizadas</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="mb-2 text-4xl font-bold text-red-400">500+</div>
              <div className="text-sm text-gray-400">Servidores Ativos</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
              <div className="mb-2 text-4xl font-bold text-purple-400">5K+</div>
              <div className="text-sm text-gray-400">Jogadores Cadastrados</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
