"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken, decodeToken, clearToken, TokenPayload } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronDown, LogOut, User, SettingsIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<TokenPayload | null>(null)

  useEffect(() => {
    const token = getToken()
    if (token) {
      setUser(decodeToken(token))
    }
  }, [])

  const handleLogout = () => {
    clearToken()
    router.push("/login")
  }

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group flex items-center gap-2 rounded-full p-1 transition-all hover:bg-gray-800/30"
        >
          <Avatar className="h-10 w-10 border-2 border-gray-700/50 ring-2 ring-transparent transition-all group-hover:border-blue-500/50 group-hover:ring-blue-500/20">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-sm font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-gray-400 transition-all group-hover:text-white" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 border border-gray-800/50 bg-gray-900/98 backdrop-blur-2xl shadow-2xl shadow-black/50"
      >
        <DropdownMenuLabel className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-gray-700/50">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-lg font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name ?? "Carregando..."}</p>
              <p className="text-xs text-gray-400">{user?.role ?? ""}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-gray-800/50" />

        <div className="p-2 space-y-1">
          <DropdownMenuItem
            className="rounded-lg text-gray-300 transition-all hover:bg-gray-800/50 hover:text-white focus:bg-gray-800/50 focus:text-white cursor-pointer"
            asChild
          >
            <Link href="/dashboard/profile" className="flex items-center">
              <User className="mr-3 h-4 w-4" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg text-gray-300 transition-all hover:bg-gray-800/50 hover:text-white focus:bg-gray-800/50 focus:text-white cursor-pointer"
            asChild
          >
            <Link href="/dashboard/settings" className="flex items-center">
              <SettingsIcon className="mr-3 h-4 w-4" />
              Configurações
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-gray-800/50" />

        <div className="p-2">
          <DropdownMenuItem
            className="rounded-lg text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
