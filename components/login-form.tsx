"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { DiscordIcon } from "@/components/icons/discord-icon"

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleDiscordLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
    }, 1000)
  }

  return (
    <Card className="w-full max-w-md border-gray-800 bg-gray-900/50 p-8 backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">Bem-vindo ao TimbasBot</h1>
        <p className="text-md text-gray-400">Entre com sua conta do Discord para acessar o ranking.</p>
      </div>

      <Button
        type="button"
        onClick={handleDiscordLogin}
        disabled={isLoading}
        className="w-full cursor-pointer bg-[#5865F2] py-6 text-lg font-semibold hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DiscordIcon className="mr-3 h-6" />
        {isLoading ? "Conectando..." : "Entrar com Discord"}
      </Button>

      <div className="mt-6 text-center text-sm text-gray-500">
        Ao entrar, você concorda com nossos{" "}
        <Link href="/terms" className="underline transition-colors hover:text-white">
          Termos de Serviço.
        </Link>
      </div>
    </Card>
  )
}
