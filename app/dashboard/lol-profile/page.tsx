import { getSession } from "@/lib/session"
import LolProfileClient from "./profile-client"

export const dynamic = "force-dynamic"

export default async function LolProfilePage() {
  const { token } = await getSession()
  return <LolProfileClient token={token} />
}
