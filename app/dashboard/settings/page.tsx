"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, Mail, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { getToken, decodeToken, clearToken, TokenPayload } from "@/lib/auth"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  BOT: "Bot",
  USER: "Usuário",
  PLAYER: "Jogador",
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<TokenPayload | null>(null)

  useEffect(() => {
    const token = getToken()
    if (token) setUser(decodeToken(token))
  }, [])

  const handleLogout = () => {
    clearToken()
    router.push("/login")
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="size-8 text-blue-500" />
      </div>
    )
  }

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "?"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-gray-400">Gerencie sua conta</p>
      </div>

      <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <User className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Minha Conta</h2>
        </div>

        <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-black/30">
          <Avatar className="h-16 w-16 border-2 border-gray-700/50">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-xl font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xl font-bold text-white">{user.name}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-black/20 p-4">
            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Nome</p>
              <p className="text-white">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-black/20 p-4">
            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-white">{user.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-black/20 p-4">
            <Shield className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Função</p>
              <p className="text-white">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-red-900/30 bg-red-950/20 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-red-500/10 p-2">
            <LogOut className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Sair da Conta</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Você será desconectado e redirecionado para a página de login.
        </p>
        <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </Card>
    </div>
  )
}
