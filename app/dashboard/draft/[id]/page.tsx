"use client"

import { use } from "react"
import { DraftClient } from "./draft-client"

export default function DraftLeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <DraftClient leagueId={id} />
}
