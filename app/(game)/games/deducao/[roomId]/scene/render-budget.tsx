"use client"

import { useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { Quality } from "../match-types"

const LIMITS = { baixo: [0.7, 1], medio: [0.8, 1.15], alto: [0.85, 1.25] } as const

export function createRenderBudget(quality: Quality, deviceRatio: number) {
  const [minimum, ceiling] = LIMITS[quality]
  const maximum = Math.min(Math.max(deviceRatio, 1), ceiling)
  let ratio = maximum, elapsed = 0, warmup = 3, healthy = 0
  let frames: number[] = []
  return {
    get ratio() { return ratio },
    sample(delta: number) {
      // Aba oculta e retomada não representam carga gráfica sustentada.
      if (delta <= 0 || delta > 0.25) { frames = []; elapsed = 0; return null }
      if (warmup > 0) { warmup -= delta; return null }
      frames.push(delta * 1000)
      elapsed += delta
      if (elapsed < 2) return null
      frames.sort((a, b) => a - b)
      const slow = frames.filter((time) => time > 22).length / frames.length
      const average = frames.reduce((sum, time) => sum + time, 0) / frames.length
      const p95 = frames[Math.floor((frames.length - 1) * 0.95)]
      let next = ratio
      if (slow > 0.18 || average > 19) { next = Math.max(minimum, ratio - 0.1); healthy = 0 }
      else if (p95 < 21.5 && average < 17.8) {
        if (++healthy >= 4) { next = Math.min(maximum, ratio + 0.05); healthy = 0 }
      } else healthy = 0
      frames = []; elapsed = 0
      next = Math.round(next * 100) / 100
      if (next === ratio) return null
      ratio = next
      warmup = 1
      return ratio
    },
  }
}

export function AdaptiveResolution({ quality, onChange }: { quality: Quality; onChange?: (ratio: number) => void }) {
  const { setDpr } = useThree()
  const budget = useMemo(() => createRenderBudget(quality, window.devicePixelRatio || 1), [quality])
  useEffect(() => { setDpr(budget.ratio); onChange?.(budget.ratio) }, [budget, setDpr, onChange])
  useFrame((_, delta) => {
    if (document.hidden) return
    const next = budget.sample(delta)
    if (next !== null) { setDpr(next); onChange?.(next) }
  })
  return null
}
