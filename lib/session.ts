import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SERVERS, SERVER_COOKIE } from "@/lib/servers"
import { decodeToken, type TokenPayload } from "@/lib/auth"

export async function getSession(): Promise<{ token: string; serverId: string; serverName: string; userId: number; payload: TokenPayload }> {
  const cookieStore = await cookies()
  const token = cookieStore.get("timbas_token")?.value
  if (!token) redirect("/login")

  const payload = decodeToken(token)
  if (!payload) redirect("/login")

  const rawServer = cookieStore.get(SERVER_COOKIE)?.value
  const serverId = SERVERS.find((s) => s.id === rawServer)?.id ?? SERVERS[0].id
  const serverName = SERVERS.find((s) => s.id === serverId)?.name ?? "Servidor"

  return { token, serverId, serverName, userId: Number(payload.sub), payload }
}
