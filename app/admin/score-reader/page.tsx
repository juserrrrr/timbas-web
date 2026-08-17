"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Eye, FileScan, Loader2, PlugZap, Save, ScanLine, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  CompetitionHeader,
  ErrorState,
  PageLoading,
  StatusPill,
  formatDateTime,
} from "@/components/competitions/shared"
import {
  getScoreReaderConfig,
  testScoreReader,
  updateScoreReaderConfig,
  type ScoreReaderConfig,
  type ScoreReaderProvider,
} from "@/lib/services/score-reader"

const PROVIDERS: Array<{
  id: ScoreReaderProvider
  title: string
  hint: string
  icon: typeof Eye
}> = [
  {
    id: "VISION",
    title: "Modelo com visão",
    hint: "A imagem vai direto para o modelo. Use com modelos que enxergam imagens.",
    icon: Eye,
  },
  {
    id: "OCR_TEXT",
    title: "OCR + modelo de texto",
    hint: "Um serviço de OCR extrai o texto e o modelo interpreta. Use com modelos que só leem texto.",
    icon: FileScan,
  },
]

const PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", provider: "VISION" as const },
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", provider: "OCR_TEXT" as const },
]

export default function ScoreReaderAdminPage() {
  const [config, setConfig] = useState<ScoreReaderConfig | null>(null)
  const [form, setForm] = useState({
    provider: "VISION" as ScoreReaderProvider,
    baseUrl: "",
    model: "",
    apiKey: "",
    ocrBaseUrl: "",
    ocrApiKey: "",
    ocrEngine: "generic",
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await getScoreReaderConfig()
      setConfig(data)
      setForm({
        provider: data.provider,
        baseUrl: data.baseUrl,
        model: data.model,
        apiKey: "",
        ocrBaseUrl: data.ocrBaseUrl ?? "",
        ocrApiKey: "",
        ocrEngine: data.ocrEngine ?? "generic",
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a configuração")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error || !config) return <ErrorState message={error || "Configuração indisponível"} retry={() => void load()} />

  const save = async () => {
    setBusy(true)
    setError("")
    try {
      const updated = await updateScoreReaderConfig({
        provider: form.provider,
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
        ocrBaseUrl: form.ocrBaseUrl.trim() || null,
        ...(form.ocrApiKey.trim() ? { ocrApiKey: form.ocrApiKey.trim() } : {}),
        ocrEngine: form.ocrEngine.trim() || null,
      })
      setConfig(updated)
      setForm((current) => ({ ...current, apiKey: "", ocrApiKey: "" }))
      setNotice("Configuração salva.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.")
    } finally {
      setBusy(false)
    }
  }

  const toggleEnabled = async (enabled: boolean) => {
    setBusy(true)
    try {
      setConfig(await updateScoreReaderConfig({ enabled }))
      setNotice(enabled ? "Leitura automática ligada." : "Leitura automática desligada — tudo passa por aprovação manual.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar.")
    } finally {
      setBusy(false)
    }
  }

  const runTest = async () => {
    setTesting(true)
    setError("")
    try {
      const result = await testScoreReader()
      setNotice(result.message)
      setConfig(await getScoreReaderConfig())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível testar a conexão.")
    } finally {
      setTesting(false)
    }
  }

  const needsOcr = form.provider === "OCR_TEXT"

  return (
    <div className="space-y-6">
      <CompetitionHeader
        eyebrow="Administração"
        title="Leitura de placar"
        subtitle="Escolha qual modelo lê as fotos enviadas pelos jogadores — ou desligue e aprove tudo na mão."
        icon={ScanLine}
        accent="text-blue-400"
        accentBg="bg-blue-500/10 border-blue-500/20"
        actions={
          <StatusPill tone={config.enabled ? (config.ready ? "live" : "warn") : "neutral"}>
            {config.enabled ? (config.ready ? "Ativa" : "Ligada, mas incompleta") : "Desligada"}
          </StatusPill>
        }
      />

      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-bold text-white">Leitura automática de placar</span>
            <span className="block text-[11px] text-gray-500">
              Com a leitura desligada, toda foto enviada vai para a fila de aprovação manual da organização de cada
              competição. Nenhuma imagem é enviada para fora.
            </span>
          </span>
          <Switch checked={config.enabled} disabled={busy} onCheckedChange={(checked) => void toggleEnabled(checked)} />
        </label>
      </Card>

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <h3 className="mb-3 text-sm font-black text-white">Como a imagem é lida</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROVIDERS.map((option) => (
            <button
              key={option.id}
              onClick={() => setForm({ ...form, provider: option.id })}
              className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                form.provider === option.id
                  ? "border-blue-500/30 bg-blue-500/[0.07]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <span className="flex items-center gap-2">
                <option.icon className={`h-4 w-4 ${form.provider === option.id ? "text-blue-400" : "text-gray-500"}`} />
                <span className={`text-sm font-bold ${form.provider === option.id ? "text-blue-400" : "text-white"}`}>
                  {option.title}
                </span>
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-gray-500">{option.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="self-center text-[11px] text-gray-600">Atalhos:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                setForm({ ...form, baseUrl: preset.baseUrl, model: preset.model, provider: preset.provider })
              }
              className="cursor-pointer rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[11px] font-bold text-gray-400 transition hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="base-url">Endpoint (compatível com OpenAI)</Label>
            <Input
              id="base-url"
              value={form.baseUrl}
              onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
              className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              value={form.model}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
              placeholder="gpt-4o-mini"
              className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="api-key">
              Chave de API {config.hasApiKey && <span className="text-emerald-400">(uma chave já está salva)</span>}
            </Label>
            <Input
              id="api-key"
              type="password"
              value={form.apiKey}
              onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
              placeholder={config.hasApiKey ? "Deixe em branco para manter a chave atual" : "sk-…"}
              className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
            />
            <p className="text-[11px] text-gray-600">
              A chave é guardada criptografada e nunca é devolvida pela API.
            </p>
          </div>
        </div>

        {needsOcr && (
          <div className="mt-4 grid gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ocr-url">Endpoint do OCR</Label>
              <Input
                id="ocr-url"
                value={form.ocrBaseUrl}
                onChange={(event) => setForm({ ...form, ocrBaseUrl: event.target.value })}
                placeholder="https://api.ocr.space/parse/image"
                className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ocr-engine">Formato do OCR</Label>
              <div className="flex gap-2">
                {["generic", "ocr.space"].map((engine) => (
                  <button
                    key={engine}
                    onClick={() => setForm({ ...form, ocrEngine: engine })}
                    className={`h-9 flex-1 cursor-pointer rounded-lg border text-xs font-bold transition ${
                      form.ocrEngine === engine
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                    }`}
                  >
                    {engine}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ocr-key">
                Chave do OCR {config.hasOcrApiKey && <span className="text-emerald-400">(já salva)</span>}
              </Label>
              <Input
                id="ocr-key"
                type="password"
                value={form.ocrApiKey}
                onChange={(event) => setForm({ ...form, ocrApiKey: event.target.value })}
                placeholder={config.hasOcrApiKey ? "Deixe em branco para manter" : "Chave do serviço de OCR"}
                className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={() => void save()} disabled={busy} className="bg-blue-500 text-white hover:bg-blue-400">
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Salvar
          </Button>
          <Button onClick={() => void runTest()} disabled={testing} variant="outline">
            {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 h-4 w-4" />}
            Testar conexão
          </Button>

          {config.lastCheckedAt && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              {config.lastCheckOk ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              )}
              Último teste em {formatDateTime(config.lastCheckedAt)}
            </span>
          )}
        </div>

        {config.lastCheckMessage && (
          <p className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 font-mono text-[11px] text-gray-500">
            {config.lastCheckMessage}
          </p>
        )}
      </Card>
    </div>
  )
}
