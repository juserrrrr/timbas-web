"use client"

import { useRiftToken } from "@/components/rift-tools-shell"
import VerifyClient from "./verify-client"

export default function VerifyPage() {
  const token = useRiftToken()
  return <VerifyClient token={token} />
}
