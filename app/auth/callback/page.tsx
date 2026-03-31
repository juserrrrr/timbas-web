"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { setToken, decodeToken } from "@/lib/auth"
import { Bot } from "lucide-react"

const ADMIN_ROLES = ["ADMIN", "admin", "Admin"]

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const error = searchParams.get("error")
    const isAdminPending =
      typeof window !== "undefined" && sessionStorage.getItem("adminPending") === "1"

    if (token) {
      if (isAdminPending) {
        sessionStorage.removeItem("adminPending")
        const payload = decodeToken(token)
        const isAdmin = payload?.role && ADMIN_ROLES.includes(payload.role)
        if (isAdmin) {
          setToken(token)
          router.replace("/admin?welcome=1")
        } else {
          router.replace("/admin/login?error=unauthorized")
        }
      } else {
        setToken(token)
        router.replace("/dashboard")
      }
    } else {
      if (isAdminPending) {
        sessionStorage.removeItem("adminPending")
        router.replace(`/admin/login?error=${error ?? "auth_failed"}`)
      } else {
        router.replace(`/login?error=${error ?? "auth_failed"}`)
      }
    }
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
