"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getToken, decodeToken, clearToken, TokenPayload } from "@/lib/auth"
import {
  LayoutDashboard,
  Users,
  Server,
  ChevronRight,
  ShieldAlert,
  LogOut,
} from "lucide-react"
import { Toaster, toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const ADMIN_ROLES = ["ADMIN", "admin", "Admin"]

const NAV = [
  { icon: LayoutDashboard, label: "Visão Geral",  href: "/admin",          color: "text-orange-400", glow: "bg-orange-500/10", active: "border-orange-500/20" },
  { icon: Users,           label: "Jogadores",    href: "/admin/players",  color: "text-blue-400",   glow: "bg-blue-500/10",   active: "border-blue-500/20" },
  { icon: Server,          label: "Servidores",   href: "/admin/servers",  color: "text-green-400",  glow: "bg-green-500/10",  active: "border-green-500/20" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<TokenPayload | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace("/admin/login")
      return
    }
    const payload = decodeToken(token)
    const isAdmin = payload?.role && ADMIN_ROLES.includes(payload.role)
    if (!isAdmin) {
      clearToken()
      router.replace("/admin/login?error=unauthorized")
      return
    }
    setUser(payload)
    setChecked(true)
  }, [])

  // Welcome toast on first access
  useEffect(() => {
    if (!checked || !user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("welcome") === "1") {
      toast.success(`Bem-vindo, ${user.name}!`, {
        description: "Acesso de administrador concedido.",
        duration: 4000,
      })
      // Remove query param without reload
      const url = new URL(window.location.href)
      url.searchParams.delete("welcome")
      window.history.replaceState({}, "", url.toString())
    }
  }, [checked, user])

  const handleLogout = () => {
    toast("Saindo...", { duration: 1500 })
    setTimeout(() => {
      clearToken()
      router.push("/admin/login")
    }, 800)
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 animate-pulse">
          <ShieldAlert className="h-6 w-6 text-orange-400" />
        </div>
      </div>
    )
  }

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "?"

  return (
    <div className="relative min-h-screen bg-[#050508] text-white">
      {/* Themed Toaster */}
      <Toaster
        position="top-right"
        expand
        richColors
        toastOptions={{
          style: {
            background: "#0d0d12",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "14px",
          },
          classNames: {
            success: "!border-green-500/25 !bg-green-500/5",
            error:   "!border-red-500/25   !bg-red-500/5",
            warning: "!border-yellow-500/25 !bg-yellow-500/5",
            info:    "!border-blue-500/25   !bg-blue-500/5",
          },
        }}
      />

      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff04_1px,_transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute -top-64 left-1/4 h-[600px] w-[600px] rounded-full bg-orange-800 opacity-[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-red-900 opacity-[0.06] blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-[#07070c] transition-all duration-300 ${
          expanded ? "w-[220px]" : "w-16"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-white/[0.06] px-3">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="relative h-8 w-8 flex-shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
              <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasAdmin" width={32} height={32} className="object-cover" />
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-orange-500 ring-2 ring-[#07070c] flex items-center justify-center">
                <ShieldAlert className="h-2 w-2 text-white" />
              </div>
            </div>
            <span
              className={`text-sm font-black tracking-tight text-white whitespace-nowrap transition-all duration-300 ${
                expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
              }`}
            >
              Timbas<span className="text-orange-400">Admin</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {NAV.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 ${
                  isActive
                    ? `border ${item.active} ${item.glow} ${item.color}`
                    : "border border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span
                  className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
                  }`}
                >
                  {item.label}
                </span>
                {!expanded && (
                  <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-lg border border-white/[0.08] bg-[#0d0d12] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] p-2 space-y-0.5">
          {/* User */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Avatar className="h-[18px] w-[18px] ring-1 ring-orange-500/30 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-orange-600 to-red-600 text-[8px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={`text-xs text-gray-400 whitespace-nowrap transition-all duration-300 truncate ${
                expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
              }`}
            >
              {user?.name}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            <span
              className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
              }`}
            >
              Sair
            </span>
            {!expanded && (
              <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-lg border border-white/[0.08] bg-[#0d0d12] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block whitespace-nowrap">
                Sair
              </div>
            )}
          </button>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          >
            <ChevronRight
              className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
            <span
              className={`text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
              }`}
            >
              Recolher
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
