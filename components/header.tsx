"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import { useState, useEffect } from "react"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 80 // Header height offset
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-gray-800 bg-black/80 backdrop-blur-lg"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a
          href="#top"
          onClick={scrollToTop}
          className="group flex cursor-pointer items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 transition-transform duration-300 ease-in-out group-hover:scale-110">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white transition-colors duration-300 group-hover:text-gray-200">
            TimbasBot
          </span>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#top"
            onClick={scrollToTop}
            className="text-base font-medium text-gray-300 transition-colors hover:text-white"
          >
            Início
          </a>
          <a
            href="#features"
            onClick={(e) => scrollToSection(e, "features")}
            className="text-base font-medium text-gray-300 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#commands"
            onClick={(e) => scrollToSection(e, "commands")}
            className="text-base font-medium text-gray-300 transition-colors hover:text-white"
          >
            Comandos
          </a>
          <a
            href="#about"
            onClick={(e) => scrollToSection(e, "about")}
            className="text-base font-medium text-gray-300 transition-colors hover:text-white"
          >
            Sobre
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Link href="/login">Entrar com Discord</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
