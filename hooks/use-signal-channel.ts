"use client"

import { useEffect, useRef, useState } from "react"
import { getToken } from "@/lib/auth"
import { createSignalTicket, streamEventsUrl, type SignalEvent } from "@/lib/services/streaming"

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
) {
  const [connected, setConnected] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const failuresRef = useRef(0)
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!peerId || !enabled) return
    const token = getToken()
    if (!token) return

    let es: EventSource | null = null
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | null = null

    const scheduleRetry = () => {
      if (cancelled || retry) return
      const delay = RETRY_STEPS_MS[Math.min(failuresRef.current, RETRY_STEPS_MS.length - 1)]
      failuresRef.current += 1
      retry = setTimeout(() => setAttempt((n) => n + 1), delay)
    }

    createSignalTicket(token, streamId, peerId)
      .then((ticket) => {
        if (cancelled) return
        es = new EventSource(streamEventsUrl(streamId, ticket))

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
      .catch(() => {
        setConnected(false)
        scheduleRetry()
      })

    return () => {
      cancelled = true
      if (retry) clearTimeout(retry)
      es?.close()
      setConnected(false)
    }
  }, [streamId, peerId, attempt, enabled])

  return connected
}
