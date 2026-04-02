"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken, decodeToken, clearToken, getDiscordAvatarUrl, TokenPayload } from "@/lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { LogOut, User, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export function UserMenu() {
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

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "?"
  const avatarUrl = getDiscordAvatarUrl(user?.discordId, user?.avatar, 128)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex cursor-pointer items-center gap-2 rounded-lg p-1 transition-all hover:bg-white/[0.05] focus:outline-none">
          <div className="hidden flex-col items-end sm:flex">
            <span className="max-w-[15ch] truncate text-sm font-semibold leading-tight text-white">
              {user?.name ?? "—"}
            </span>
            <span className="text-[11px] leading-tight text-gray-500">User</span>
          </div>
          <Avatar className="h-8 w-8 ring-1 ring-white/10 transition-all group-hover:ring-blue-500/30">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.name ?? ""} />}
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl border border-white/[0.08] bg-[#0d0d12] p-1 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="h-9 w-9 ring-1 ring-white/10">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.name ?? ""} />}
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-sm font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.name ?? "—"}</p>
            <p className="truncate text-xs text-gray-600">{user?.role ?? ""}</p>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />

        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2 text-sm text-gray-400 focus:bg-white/[0.05] focus:text-white">
          <Link href="/dashboard/profile" prefetch={false} className="flex items-center gap-2.5">
            <User className="h-4 w-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2 text-sm text-gray-400 focus:bg-white/[0.05] focus:text-white">
          <Link href="/dashboard/settings" prefetch={false} className="flex items-center gap-2.5">
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-300"
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
