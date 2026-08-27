"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "@/lib/toast"
import { AdminSidebar } from "@/components/admin-sidebar"
import { getToken, decodeToken, clearToken, TokenPayload } from "@/lib/auth"
import { getMyPermissions } from "@/lib/services/access"
import { NavigationProvider } from "@/lib/navigation-context"
import { LoadingState } from "@/components/ui/loading-state"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<TokenPayload | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  /// A tela de entrada mora dentro de /admin, mas não pode passar pela
  /// portaria: quem chega nela é justamente quem ainda não tem sessão.
  const isLoginRoute = pathname === "/admin/login"

  // Quem entra no painel não é mais só o ADMIN fixo: qualquer permissão de painel
  // abre a porta, e o menu mostra só o que a pessoa pode.
  useEffect(() => {
    if (isLoginRoute) return
    const token = getToken()
    if (!token) {
      router.replace("/admin/login")
      return
    }

    const payload = decodeToken(token)
    getMyPermissions()
      .then((result) => {
        if (result.permissions.length === 0) {
          clearToken()
          router.replace("/admin/login?error=unauthorized")
          return
        }
        setUser(payload)
        setPermissions(result.permissions)
        setChecked(true)
      })
      .catch(() => {
        clearToken()
        router.replace("/admin/login?error=unauthorized")
      })
  }, [isLoginRoute, router])

  useEffect(() => {
    if (!checked || !user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("welcome") === "1") {
      toast.success(`Bem-vindo, ${user.name}!`, { description: "Acesso ao painel concedido.", duration: 4000 })
      const url = new URL(window.location.href)
      url.searchParams.delete("welcome")
      window.history.replaceState({}, "", url.toString())
    }
  }, [checked, user])

  const handleLogout = () => {
    toast.loading("Saindo da conta", { duration: 1500 })
    setTimeout(() => {
      clearToken()
      router.push("/admin/login")
    }, 800)
  }

  if (isLoginRoute) return <>{children}</>

  if (!checked) {
    return <div className="min-h-[100dvh] bg-[#050508]"><LoadingState className="m-0 min-h-[100dvh]" /></div>
  }

  return (
    <NavigationProvider>
    <div className="relative min-h-[100dvh] bg-[#050508] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff04_1px,_transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute -top-64 left-1/4 h-[600px] w-[600px] rounded-full bg-orange-800 opacity-[0.06] blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-red-900 opacity-[0.06] blur-[120px]" />
      </div>

      <AdminSidebar permissions={permissions} userName={user?.name ?? ""} onLogout={handleLogout} />

      <main className="ml-[65px] min-h-[100dvh]">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"><div key={pathname} className="dashboard-view">{children}</div></div>
      </main>
    </div>
    </NavigationProvider>
  )
}
