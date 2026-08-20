"use client"

import { useEffect, useState } from "react"
import { getToken } from "@/lib/auth"
import { getFeatureFlags } from "@/lib/services/feature-flags"

let cache: Promise<string[]> | null = null

function loadEnabledFlags(): Promise<string[]> {
  if (cache) return cache
  const token = getToken()
  if (!token) return Promise.resolve([])

  cache = getFeatureFlags(token)
    .then((flags) => flags.filter((flag) => flag.enabled).map((flag) => flag.key))
    .catch(() => {
      cache = null
      return []
    })
  return cache
}

/// Chaves das features ligadas. Serve para esconder da navegação o que o admin
/// desligou; a API recusa de qualquer jeito.
export function useEnabledFeatures(): string[] {
  const [flags, setFlags] = useState<string[]>([])

  useEffect(() => {
    let active = true
    void loadEnabledFlags().then((enabled) => {
      if (active) setFlags(enabled)
    })
    return () => { active = false }
  }, [])

  return flags
}
