"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, Mail, Shield } from "lucide-react"
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

  if (!user) return <div className="flex h-64 items-center justify-center"><Spinner className="size-8 text-blue-500" /></div>

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "?"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie sua conta</p>
      </div>

      {/* Account card */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <User className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Minha Conta</h2>
        </div>

        {/* Profile row */}
        <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-5">
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/40 to-red-500/30">
            <Avatar className="h-14 w-14 rounded-[13px]">
              <AvatarFallback className="rounded-[13px] bg-gradient-to-br from-blue-600 to-red-600 text-xl font-black text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className="font-bold text-white">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email || "—"}</p>
            <span className="mt-1 inline-block rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="divide-y divide-white/[0.04]">
          {[
            { icon: User,   label: "Nome",   value: user.name },
            { icon: Mail,   label: "Email",  value: user.email || "—" },
            { icon: Shield, label: "Função", value: ROLE_LABELS[user.role] ?? user.role },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <Icon className="h-4 w-4 flex-shrink-0 text-gray-600" />
              <div className="min-w-0">
                <p className="text-xs text-gray-600">{label}</p>
                <p className="text-sm font-medium text-white truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-red-500/10 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
            <LogOut className="h-3.5 w-3.5 text-red-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Sair da Conta</h2>
        </div>
        <div className="px-5 py-5">
          <p className="mb-4 text-sm text-gray-500">
            Você será desconectado e redirecionado para a página de login.
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-600/80 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/20"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
