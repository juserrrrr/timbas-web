"use client"

import { useCallback, useEffect, useRef } from "react"

type SmartPollingOptions = {
  enabled?: boolean
  immediate?: boolean
  intervalMs: number
}

export function useSmartPolling(
  task: () => void | Promise<void>,
  { enabled = true, immediate = true, intervalMs }: SmartPollingOptions,
) {
  const taskRef = useRef(task)
  const inFlightRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    taskRef.current = task
  }, [task])

  const refresh = useCallback(() => {
    if (inFlightRef.current) return inFlightRef.current
    let request: Promise<void>
    request = Promise.resolve(taskRef.current()).finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = null
    })
    inFlightRef.current = request
    return request
  }, [])

  useEffect(() => {
    if (!enabled) return
    let active = true
    let timer: number | null = null

    const schedule = () => {
      if (!active) return
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (document.visibilityState !== "visible" || !navigator.onLine) {
          schedule()
          return
        }
        void refresh().finally(schedule)
      }, intervalMs)
    }

    const wake = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return
      if (timer !== null) window.clearTimeout(timer)
      void refresh().finally(schedule)
    }

    if (immediate && document.visibilityState === "visible" && navigator.onLine) {
      void refresh().finally(schedule)
    } else {
      schedule()
    }
    document.addEventListener("visibilitychange", wake)
    window.addEventListener("focus", wake)
    window.addEventListener("online", wake)

    return () => {
      active = false
      if (timer !== null) window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", wake)
      window.removeEventListener("focus", wake)
      window.removeEventListener("online", wake)
    }
  }, [enabled, immediate, intervalMs, refresh])

  return refresh
}
