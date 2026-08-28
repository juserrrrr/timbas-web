"use client"

import { useRiftToken } from "@/components/rift-tools-shell"
import ClashScoutClient from "./clash-client"

export default function ClashPage() {
  const token = useRiftToken()
  return <ClashScoutClient token={token} />
}
