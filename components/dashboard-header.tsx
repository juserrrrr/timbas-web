"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bot, LogOut, ChevronDown, User, SettingsIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardHeader() {
  // Mock user data - replace with real Discord user data
  const user = {
    name: "ProGamer",
    avatar: "/discord-user-avatar.png",
    discriminator: "#1234",
  }

  return (
    <header className="border-b border-gray-800/50 bg-gradient-to-r from-gray-900/80 via-black/80 to-gray-900/80 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-8">
        {/* Logo - visible on mobile when sidebar is collapsed */}
        <Link href="/" className="group flex items-center gap-3 transition-all hover:scale-105 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/50 transition-shadow group-hover:shadow-xl group-hover:shadow-blue-500/60">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
            TimbasBot
          </span>
        </Link>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-800/30"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.discriminator}</p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-gray-700 transition-all group-hover:border-blue-500">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-hover:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border border-gray-800/50 bg-gray-900/95 backdrop-blur-xl">
              <DropdownMenuLabel className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-gray-700">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.discriminator}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-800/50" />
              <DropdownMenuItem className="mx-2 rounded-lg text-gray-300 transition-all hover:bg-gray-800/50 hover:text-white focus:bg-gray-800/50 focus:text-white">
                <User className="mr-3 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="mx-2 rounded-lg text-gray-300 transition-all hover:bg-gray-800/50 hover:text-white focus:bg-gray-800/50 focus:text-white">
                <SettingsIcon className="mr-3 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800/50" />
              <DropdownMenuItem
                className="mx-2 rounded-lg text-red-400 transition-all hover:bg-red-500/10 hover:text-red-400 focus:bg-red-500/10 focus:text-red-400"
                asChild
              >
                <Link href="/login" className="flex items-center">
                  <LogOut className="mr-3 h-4 w-4" />
                  Sair
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
