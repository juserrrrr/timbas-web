import { post, request } from "./http"
import type { AwardCardLayoutSettings } from "@/lib/award-card-config"
import type { AwardCardSettings } from "@/lib/champion-card-config"

export type CompleteAwardCardSettings = AwardCardLayoutSettings & AwardCardSettings

export function getAwardCardSettings(): Promise<CompleteAwardCardSettings> {
  return request("/tournaments/award-cards/settings")
}

export function getAdminAwardCardSettings(): Promise<CompleteAwardCardSettings> {
  return request("/admin/demo/award-card-settings")
}

export function saveAdminAwardCardSettings(input: CompleteAwardCardSettings): Promise<CompleteAwardCardSettings> {
  return post("/admin/demo/award-card-settings", input)
}
