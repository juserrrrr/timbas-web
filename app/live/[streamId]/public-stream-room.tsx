"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Radio } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import { getLiveClientId, joinPublicStream, joinStream, type StreamSummary } from "@/lib/services/streaming"
import { ViewerStage } from "@/app/dashboard/live/[streamId]/viewer-stage"
import { SfuViewerStage } from "@/app/dashboard/live/[streamId]/sfu-viewer-stage"

interface WatchSession {
  peerId: string
  guestToken?: string
  stream: StreamSummary
  sfu?: boolean
  owner?: boolean
}

export function PublicStreamRoom({ streamId }: { streamId: string }) {
  const [session, setSession] = useState<WatchSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const joinedRef = useRef(false)

  const connect = useCallback(async () => {
    const token = getToken()
    const clientId = getLiveClientId()
    const joined = token
      ? await joinStream(token, streamId, clientId, true)
      : await joinPublicStream(streamId, clientId)
    setSession(joined)
    setError(null)
  }, [streamId])

  useEffect(() => {
    if (joinedRef.current) return
    joinedRef.current = true
    void connect()
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível abrir a transmissão."))
  }, [connect])

  if (error) {
    const loginRequired = !getToken() && error.toLocaleLowerCase("pt-BR").includes("privada")
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#050508] px-6 text-center text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <Radio className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-sm font-bold">{error}</p>
        {loginRequired && (
          <Link
            href={`/login?redirect=${encodeURIComponent(`/live/${streamId}`)}`}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            Entrar para assistir
          </Link>
        )}
      </div>
    )
  }

  if (!session) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508]"><Spinner className="size-5 text-red-400" /></div>
  }

  // O link público leva o dono para a página de espectador da própria live, e
  // sem essa saída ele fica preso assistindo até a transmissão encerrar.
  const stageProps = {
    streamId,
    peerId: session.peerId,
    stream: session.stream,
    guestToken: session.guestToken,
    studioHref: session.owner ? `/dashboard/live/${session.stream.id}/studio` : undefined,
    onReconnect: connect,
  }

  return (
    <main className="min-h-[100dvh] bg-[#050508] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        {session.sfu ? (
          <SfuViewerStage {...stageProps} />
        ) : (
          <ViewerStage {...stageProps} />
        )}
      </div>
    </main>
  )
}
