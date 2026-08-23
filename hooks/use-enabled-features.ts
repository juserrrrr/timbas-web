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

/// Chaves das features ligadas, ou null enquanto a resposta não chegou.
///
/// A diferença entre "ainda não sei" e "sei que está desligada" importa: as
/// flags vêm por fetch, então tratar o estado inicial como lista vazia fazia o
/// menu nascer com tudo bloqueado e destravar meio segundo depois. Com null a
/// navegação não marca nada até ter a resposta de verdade.
export function useEnabledFeatures(): string[] | null {
  const [flags, setFlags] = useState<string[] | null>(null)

  useEffect(() => {
    let active = true
    void loadEnabledFlags().then((enabled) => {
      if (active) setFlags(enabled)
    })
    return () => { active = false }
  }, [])

  return flags
}
