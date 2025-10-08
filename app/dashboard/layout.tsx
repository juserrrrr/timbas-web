import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Button } from "@/components/ui/button"
import { LogOut, ChevronDown, User, SettingsIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mock user data - replace with real Discord user data
  const user = {
    name: "ProGamer",
    avatar: "/user-avatar.jpg",
    discriminator: "#1234",
  }

  return (
    <div className="relative h-screen bg-black text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Blue neon blob - top left */}
        <div
          className="absolute top-0 left-0 h-[600px] w-[600px] opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 1) 0%, rgba(37, 99, 235, 0.6) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        {/* Red neon blob - bottom right */}
        <div
          className="absolute bottom-0 right-0 h-[600px] w-[600px] opacity-60"
          style={{
            background: "radial-gradient(circle, rgba(239, 68, 68, 1) 0%, rgba(220, 38, 38, 0.6) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        {/* Purple accent blob - center */}
        <div
          className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse, rgba(147, 51, 234, 0.8) 0%, rgba(126, 34, 206, 0.4) 50%, transparent 70%)",
            filter: "blur(80px)",
            transform: "translate(-50%, -50%) rotate(45deg)",
          }}
        />
      </div>

      <div className="relative z-10">
        <DashboardSidebar />

        <div className="fixed right-6 top-6 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group flex items-center gap-2 rounded-full p-1 transition-all hover:bg-gray-800/30"
              >
                <Avatar className="h-10 w-10 border-2 border-gray-700/50 ring-2 ring-transparent transition-all group-hover:border-blue-500/50 group-hover:ring-blue-500/20">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-sm font-bold text-white">
                    ?
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
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-lg font-bold text-white">
                      ?
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.discriminator}</p>
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
                  asChild
                >
                  <Link href="/login" className="flex items-center">
                    <LogOut className="mr-3 h-4 w-4" />
                    Sair
                  </Link>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <main className="ml-20 h-screen overflow-y-auto custom-scrollbar">
          <div className="container mx-auto px-4 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
