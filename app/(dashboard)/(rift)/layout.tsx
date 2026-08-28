import type React from "react"
import { RiftToolsShell } from "@/components/rift-tools-shell"
import { getSession } from "@/lib/session"

/// Clash Scout, verificação e perfil dividem o mesmo cabeçalho e as mesmas
/// abas, então a casca mora aqui: trocar de aba troca só o miolo. A sessão
/// também é lida uma vez só, aqui, e as páginas de dentro viram client puro,
/// sem nova ida ao servidor a cada clique nas abas.
export default async function RiftToolsLayout({ children }: { children: React.ReactNode }) {
  const { token } = await getSession()
  return <RiftToolsShell token={token}>{children}</RiftToolsShell>
}
