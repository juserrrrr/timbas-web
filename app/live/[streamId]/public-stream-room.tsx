"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Radio } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getLiveClientId, joinPublicStream, type PublicJoinStreamResult } from "@/lib/services/streaming"
import { ViewerStage } from "@/app/dashboard/live/[streamId]/viewer-stage"

export function PublicStreamRoom({ streamId }: { streamId: string }) {
  const [session, setSession] = useState<PublicJoinStreamResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const joinedRef = useRef(false)

  const connect = useCallback(async () => {
    const joined = await joinPublicStream(streamId, getLiveClientId())
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
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#050508] px-6 text-center text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <Radio className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-sm font-bold">{error}</p>
      </div>
    )
  }

  if (!session) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508]"><Spinner className="size-5 text-red-400" /></div>
  }

  return (
    <main className="min-h-[100dvh] bg-[#050508] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <ViewerStage streamId={streamId} peerId={session.peerId} stream={session.stream} guestToken={session.guestToken} onReconnect={connect} />
      </div>
    </main>
  )
}
