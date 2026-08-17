import { patch, post, request } from "./http"

export type AiProvider = "GEMINI" | "DEEPSEEK" | "OPENAI"
export type ScoreReadMode = "VISION" | "OCR_TEXT"

export interface AiProviderInfo {
  id: AiProvider
  label: string
  envKey: string
  defaultModel: string
  defaultFallbackModel: string
  supportsVision: boolean
  docsUrl: string
  configured: boolean
}

export interface AiFeatureView {
  enabled: boolean
  provider: AiProvider
  model: string | null
  effectiveModel: string | null
  ready: boolean
  unavailableReason: string | null
}

export interface AiSettings {
  providers: AiProviderInfo[]
  ocrKeyConfigured: boolean
  analysis: AiFeatureView & { fallbackModel: string | null }
  scoreReader: AiFeatureView & {
    mode: ScoreReadMode
    ocrBaseUrl: string | null
    ocrEngine: string | null
  }
  timeoutMs: number
  maxImageBytes: number
  lastCheckedAt: string | null
  lastCheckOk: boolean | null
  lastCheckMessage: string | null
  updatedAt: string
}

export interface AiSettingsPatch {
  analysisEnabled?: boolean
  analysisProvider?: AiProvider
  analysisModel?: string | null
  analysisFallbackModel?: string | null
  scoreReaderEnabled?: boolean
  scoreReaderProvider?: AiProvider
  scoreReaderModel?: string | null
  scoreReadMode?: ScoreReadMode
  ocrBaseUrl?: string | null
  ocrEngine?: string | null
  timeoutMs?: number
  maxImageBytes?: number
}

export function getAiSettings(): Promise<AiSettings> {
  return request("/admin/ai")
}

export function updateAiSettings(input: AiSettingsPatch): Promise<AiSettings> {
  return patch("/admin/ai", input)
}

export function testAiConnection(): Promise<AiSettings> {
  return post("/admin/ai/test")
}
