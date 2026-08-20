"use client"

import { useEffect, useRef, useState } from "react"
import { getToken } from "@/lib/auth"
import { createPublicSignalTicket, createSignalTicket, publicStreamEventsUrl, streamEventsUrl, type SignalEvent } from "@/lib/services/streaming"

const RETRY_STEPS_MS = [3000, 6000, 12000, 30000]

/**
 * Signaling channel over SSE. Each connection burns a single-use ticket, so a
 * dropped stream is reopened by minting a new one instead of letting
 * EventSource retry the dead URL.
 */
export function useSignalChannel(
  streamId: string,
  peerId: string | null,
  onEvent: (event: SignalEvent) => void,
  enabled = true,
  guestToken?: string,
  recoverSession?: () => Promise<void>,
) {
  const [connected, setConnected] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const failuresRef = useRef(0)
  const handlerRef = useRef(onEvent)
  const recoverRef = useRef(recoverSession)
  handlerRef.current = onEvent
  recoverRef.current = recoverSession

  useEffect(() => {
    if (!peerId || !enabled) return
    const token = getToken()
    if (!guestToken && !token) return

    let es: EventSource | null = null
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | null = null

    const scheduleRetry = () => {
      if (cancelled || retry) return
      const delay = RETRY_STEPS_MS[Math.min(failuresRef.current, RETRY_STEPS_MS.length - 1)]
      failuresRef.current += 1
      retry = setTimeout(() => setAttempt((n) => n + 1), delay)
    }

    const ticketRequest = guestToken
      ? createPublicSignalTicket(streamId, peerId, guestToken)
      : createSignalTicket(token!, streamId, peerId)

    ticketRequest
      .then((ticket) => {
        if (cancelled) return
        es = new EventSource(guestToken ? publicStreamEventsUrl(streamId, ticket) : streamEventsUrl(streamId, ticket))

        es.onopen = () => {
          failuresRef.current = 0
          setConnected(true)
        }
        es.onmessage = (event) => {
          try {
            handlerRef.current(JSON.parse(event.data))
          } catch {}
        }
        es.onerror = () => {
          setConnected(false)
          es?.close()
          scheduleRetry()
        }
      })
      .catch(async () => {
        if (cancelled) return
        setConnected(false)
        if (recoverRef.current) {
          try {
            await recoverRef.current()
            failuresRef.current = 0
            return
          } catch {}
        }
        scheduleRetry()
      })

    return () => {
      cancelled = true
      if (retry) clearTimeout(retry)
      es?.close()
      setConnected(false)
    }
  }, [streamId, peerId, attempt, enabled, guestToken])

  return connected
}
