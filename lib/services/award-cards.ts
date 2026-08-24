import { post, request } from "./http"
import type { AwardCardLayoutSettings } from "@/lib/award-card-config"

export function getAwardCardSettings(): Promise<AwardCardLayoutSettings> {
  return request("/tournaments/award-cards/settings")
}

export function getAdminAwardCardSettings(): Promise<AwardCardLayoutSettings> {
  return request("/admin/demo/award-card-settings")
}

export function saveAdminAwardCardSettings(input: AwardCardLayoutSettings): Promise<AwardCardLayoutSettings> {
  return post("/admin/demo/award-card-settings", input)
}
