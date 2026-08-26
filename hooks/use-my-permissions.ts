"use client"

import { useEffect, useState } from "react"
import { getMyPermissions } from "@/lib/services/access"

export function useMyPermissions(): string[] | null {
  const [permissions, setPermissions] = useState<string[] | null>(null)

  useEffect(() => {
    let active = true
    void getMyPermissions()
      .then((result) => { if (active) setPermissions(result.permissions) })
      .catch(() => { if (active) setPermissions([]) })
    return () => { active = false }
  }, [])

  return permissions
}
