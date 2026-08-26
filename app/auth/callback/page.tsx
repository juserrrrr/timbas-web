"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { setSessionHint, type TokenPayload } from "@/lib/auth"
import { Bot } from "lucide-react"

const ADMIN_ROLES = ["ADMIN", "admin", "Admin"]
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")
    const isAdminPending =
      typeof window !== "undefined" && sessionStorage.getItem("adminPending") === "1"

    fetch(`${API_URL}/auth/validate-token`, { method: "POST", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("invalid session")
        const result = await response.json() as { data: TokenPayload }
        setSessionHint(result.data)
      if (isAdminPending) {
        sessionStorage.removeItem("adminPending")
        const payload = result.data
        const isAdmin = payload?.role && ADMIN_ROLES.includes(payload.role)
        if (isAdmin) {
          router.replace("/admin?welcome=1")
        } else {
          router.replace("/admin/login?error=unauthorized")
        }
      } else {
        const redirectPath = searchParams.get("redirect")
        if (redirectPath && redirectPath.startsWith('/')) {
          router.replace(redirectPath)
        } else {
          router.replace("/dashboard")
        }
      }
      })
      .catch(() => {
      if (isAdminPending) {
        sessionStorage.removeItem("adminPending")
        router.replace(`/admin/login?error=${error ?? "auth_failed"}`)
      } else {
        router.replace(`/login?error=${error ?? "auth_failed"}`)
      }
      })
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 animate-pulse">
        <Bot className="h-9 w-9 text-white" />
      </div>
      <p className="text-gray-400">Autenticando com Discord...</p>
    </div>
  )
}
