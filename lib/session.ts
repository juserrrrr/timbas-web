import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TIMBAS_SERVER_ID, TIMBAS_SERVER_NAME } from "@/lib/servers"
import { decodeToken, type TokenPayload } from "@/lib/auth"

export async function getSession(): Promise<{ token: string; serverId: string; serverName: string; userId: number; payload: TokenPayload }> {
  const cookieStore = await cookies()
  const token = cookieStore.get("timbas_token")?.value
  if (!token) redirect("/login")

  const payload = decodeToken(token)
  if (!payload) redirect("/login")

  return { token, serverId: TIMBAS_SERVER_ID, serverName: TIMBAS_SERVER_NAME, userId: Number(payload.sub), payload }
}
