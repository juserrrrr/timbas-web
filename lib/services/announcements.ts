import { apiUrl, post, request } from "./http"

export interface PlatformAnnouncement {
  id: string
  title: string
  summary: string
  content: string
  publishedAt: string
}

export async function getLatestAnnouncement(): Promise<PlatformAnnouncement | null> {
  const response = await fetch(apiUrl("/announcements/latest"), { cache: "no-store" })
  if (!response.ok) throw new Error("Não foi possível carregar as novidades.")
  return response.json()
}

export function getAdminAnnouncement() {
  return request<PlatformAnnouncement | null>("/admin/demo/announcement")
}

export function publishAnnouncement(input: Pick<PlatformAnnouncement, "title" | "summary" | "content">) {
  return post<PlatformAnnouncement>("/admin/demo/announcement", input)
}
