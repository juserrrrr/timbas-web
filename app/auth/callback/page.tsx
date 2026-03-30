"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { setToken } from "@/lib/auth"
import { Bot } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const error = searchParams.get("error")

    if (token) {
      setToken(token)
      router.replace("/dashboard")
    } else {
      router.replace(`/login?error=${error ?? "auth_failed"}`)
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
