"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function Header() {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-gray-800 bg-black/80 backdrop-blur-lg"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div
        className={`container mx-auto flex h-16 items-center px-4 ${
          isLoginPage ? "justify-start" : "justify-between"
        }`}
      >
        <a
          id="header-logo"
          href={isLoginPage ? "/" : "/#top"}
          className="group flex items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 transition-transform duration-300 ease-in-out group-hover:scale-110">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white transition-colors duration-300 group-hover:text-gray-200">
            TimbasBot
          </span>
        </a>

        {!isLoginPage && (
          <>
            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/#top"
                className="text-base font-medium text-gray-300 transition-colors hover:text-white"
              >
                Início
              </Link>
              <Link
                href="/#features"
                className="text-base font-medium text-gray-300 transition-colors hover:text-white"
              >
                Features
              </Link>
              <Link
                href="/#commands"
                className="text-base font-medium text-gray-300 transition-colors hover:text-white"
              >
                Comandos
              </Link>
              <Link
                href="/#about"
                className="text-base font-medium text-gray-300 transition-colors hover:text-white"
              >
                Sobre
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                <Link href="/login">Entrar com Discord</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
