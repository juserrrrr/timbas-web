import { patch, post, request } from "./http"

export type ScoreReaderProvider = "VISION" | "OCR_TEXT"

export interface ScoreReaderConfig {
  enabled: boolean
  provider: ScoreReaderProvider
  baseUrl: string
  model: string
  hasApiKey: boolean
  ocrBaseUrl: string | null
  hasOcrApiKey: boolean
  ocrEngine: string | null
  timeoutMs: number
  maxImageBytes: number
  lastCheckedAt: string | null
  lastCheckOk: boolean | null
  lastCheckMessage: string | null
  updatedAt: string
  ready: boolean
}

export interface ScoreReaderPatch {
  enabled?: boolean
  provider?: ScoreReaderProvider
  baseUrl?: string
  model?: string
  apiKey?: string | null
  ocrBaseUrl?: string | null
  ocrApiKey?: string | null
  ocrEngine?: string | null
  timeoutMs?: number
  maxImageBytes?: number
}

export function getScoreReaderConfig(): Promise<ScoreReaderConfig> {
  return request("/admin/score-reader")
}

export function updateScoreReaderConfig(input: ScoreReaderPatch): Promise<ScoreReaderConfig> {
  return patch("/admin/score-reader", input)
}

export function testScoreReader(): Promise<{ ok: boolean; message: string }> {
  return post("/admin/score-reader/test")
}
