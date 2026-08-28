"use client"

import { useRiftToken } from "@/components/rift-tools-shell"
import LolProfileClient from "./profile-client"

export default function LolProfilePage() {
  const token = useRiftToken()
  return <LolProfileClient token={token} />
}
