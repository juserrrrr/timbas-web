"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useActiveSection, useScrollProgress } from "./motion"

const LINKS = [
  { id: "tudo", label: "O que tem" },
  { id: "campeonatos", label: "Campeonatos" },
  { id: "ea", label: "EA automático" },
  { id: "partidas", label: "Partidas" },
  { id: "draft", label: "Draft" },
  { id: "bot", label: "Bot" },
]

const IDS = LINKS.map((link) => link.id)

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const progress = useScrollProgress()
  const active = useActiveSection(IDS)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-2xl" : "border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex flex-shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80">
          <span className="h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/10">
            <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="Timbas" width={32} height={32} className="object-cover" />
          </span>
          <span className="text-[15px] font-black tracking-tight text-white">Timbas</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={`relative rounded-lg px-3 py-2 text-[13px] transition-colors ${
                active === link.id ? "text-white" : "text-gray-500 hover:text-gray-200"
              }`}
            >
              {link.label}
              {active === link.id && (
                <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-blue-400 to-red-400" />
              )}
            </a>
          ))}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-[13px] text-gray-500 transition-colors hover:text-white sm:block"
          >
            Painel
          </Link>
          <Button asChild size="sm" className="bg-blue-600 px-4 font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-500">
            <Link href="/dashboard">Entrar com Discord</Link>
          </Button>
        </div>
      </div>

      {/* Quanto da página já rolou. Azul de um lado, vermelho do outro, como o
          escudo. */}
      <div className="h-px w-full bg-white/[0.05]">
        <div
          className="h-full origin-left bg-gradient-to-r from-blue-500 via-white/60 to-red-500 transition-transform duration-150"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  )
}
