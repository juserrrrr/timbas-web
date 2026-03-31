"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import Image from "next/image"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" })
  }

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "border-b border-white/[0.06] bg-[#050508]/90 backdrop-blur-2xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a
          href="#top"
          onClick={scrollToTop}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80 cursor-pointer"
        >
          <div className="h-8 w-8 rounded-xl overflow-hidden ring-1 ring-white/10">
            <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={32} height={32} className="object-cover" />
          </div>
          <span className="text-base font-black tracking-tight text-white">
            Timbas<span className="text-blue-400">Bot</span>
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {[
            { label: "Início", id: "top", isTop: true },
            { label: "Features", id: "features" },
            { label: "Como Funciona", id: "how-it-works" },
            { label: "Comandos", id: "commands" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => item.isTop ? scrollToTop(e) : scrollToSection(e, item.id)}
              className="rounded-lg px-3.5 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hidden text-sm text-gray-500 hover:text-white transition-colors sm:block">
            Dashboard
          </Link>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 font-semibold px-4">
            <Link href="/login">Entrar com Discord</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
