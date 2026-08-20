"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Radio } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import { getLiveClientId, joinStream, type JoinStreamResult } from "@/lib/services/streaming"
import { HostStage } from "./host-stage"
import { ViewerStage } from "./viewer-stage"

export function StreamRoom({ streamId, expectedRole }: { streamId: string; expectedRole: "host" | "viewer" }) {
  const [session, setSession] = useState<JoinStreamResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const joinedRef = useRef(false)

  const connect = useCallback(async () => {
    const token = getToken()
    if (!token) throw new Error("Faça login para assistir.")

    const joined = await joinStream(token, streamId, getLiveClientId(), expectedRole === "viewer")
    setSession(joined)
    setError(null)
  }, [expectedRole, streamId])

  useEffect(() => {
    if (joinedRef.current) return
    joinedRef.current = true

    void connect()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao entrar na transmissão"))
  }, [connect])

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <Radio className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-sm font-bold text-white">{error}</p>
        <Link
          href="/dashboard/live"
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para as transmissões
        </Link>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (session.role !== expectedRole) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <Radio className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-sm font-bold text-white">
          {expectedRole === "host" ? "Este estúdio pertence a outra pessoa." : "Você é o criador desta transmissão."}
        </p>
        <Link href={expectedRole === "host" ? `/dashboard/live/${streamId}/watch` : `/dashboard/live/${streamId}/studio`} className="text-xs font-semibold text-blue-400 hover:text-blue-300">
          Abrir a tela correta
        </Link>
      </div>
    )
  }

  if (expectedRole === "host") {
    return (
      <HostStage
        streamId={streamId}
        peerId={session.peerId}
        stream={session.stream}
        initialViewers={session.viewers}
        onReconnect={connect}
      />
    )
  }

  return (
    <ViewerStage streamId={streamId} peerId={session.peerId} stream={session.stream} onReconnect={connect} />
  )
}
