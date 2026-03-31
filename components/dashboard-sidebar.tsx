"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Trophy, History, Settings, BarChart3, Home, Bot, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()

  const menuItems = [
    { icon: Home, label: "Início", href: "/dashboard" },
    { icon: Trophy, label: "Ranking", href: "/dashboard/ranking" },
    { icon: History, label: "Histórico", href: "/dashboard/history" },
    { icon: Users, label: "Duplas", href: "/dashboard/teams" },
    { icon: BarChart3, label: "Estatísticas", href: "/dashboard/stats" },
    { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-gray-800/30 bg-gradient-to-b from-gray-900/50 to-black/50 backdrop-blur-2xl transition-all duration-300 ${
          isExpanded ? "w-64" : "w-20"
        }`}
      >
        <div className="flex h-20 items-center justify-center border-b border-gray-800/30 px-4">
          {isExpanded ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
                TimbasBot
              </span>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30">
              <Bot className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className={`flex items-center px-3 py-3 ${isExpanded ? "justify-end" : "justify-center"}`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 rounded-lg text-gray-400 transition-all hover:bg-gray-800/30 hover:text-white"
          >
            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
          </Button>
        </div>

        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 ${
                  isActive ? "bg-blue-500/10 text-blue-400" : "text-gray-400 hover:bg-gray-800/20 hover:text-white"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                )}

                <item.icon className="relative z-10 h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {isExpanded && (
                  <span className="relative z-10 text-sm font-medium transition-all duration-200">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
