"use client"

import { use } from "react"
import { TournamentClient } from "./tournament-client"

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <TournamentClient tournamentId={id} />
}
