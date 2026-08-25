"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Toaster, toast } from "sonner"
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

  // Quem entra no painel não é mais só o ADMIN fixo: qualquer permissão de painel
  // abre a porta, e o menu mostra só o que a pessoa pode.
  useEffect(() => {
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
  }, [router])

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
    toast("Saindo...", { duration: 1500 })
    setTimeout(() => {
      clearToken()
      router.push("/admin/login")
    }, 800)
  }

  if (!checked) {
    return <div className="min-h-[100dvh] bg-[#050508]"><LoadingState className="m-0 min-h-[100dvh]" /></div>
  }

  return (
    <NavigationProvider>
    <div className="relative min-h-[100dvh] bg-[#050508] text-white">
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
            error: "!border-red-500/25   !bg-red-500/5",
            warning: "!border-yellow-500/25 !bg-yellow-500/5",
            info: "!border-blue-500/25   !bg-blue-500/5",
          },
        }}
      />

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
