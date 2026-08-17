"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Brain,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileScan,
  KeyRound,
  Loader2,
  PlugZap,
  Save,
  ScanLine,
  XCircle,
} from "lucide-react"
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
  getAiSettings,
  testAiConnection,
  updateAiSettings,
  type AiProvider,
  type AiSettings,
  type AiSettingsPatch,
  type ScoreReadMode,
} from "@/lib/services/ai-settings"

const READ_MODES: Array<{ id: ScoreReadMode; title: string; hint: string; icon: typeof Eye }> = [
  {
    id: "VISION",
    title: "Modelo com visão",
    hint: "A imagem vai direto para o modelo. Só funciona com provedores que enxergam imagens.",
    icon: Eye,
  },
  {
    id: "OCR_TEXT",
    title: "OCR + modelo de texto",
    hint: "A própria API extrai o texto da imagem e o modelo interpreta. Use com modelos que só leem texto.",
    icon: FileScan,
  },
]

function ProviderPicker({
  providers,
  value,
  onChange,
  requireVision,
}: {
  providers: AiSettings["providers"]
  value: AiProvider
  onChange: (provider: AiProvider) => void
  requireVision?: boolean
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {providers.map((provider) => {
        const blocked = requireVision && !provider.supportsVision
        const selected = value === provider.id
        return (
          <button
            key={provider.id}
            onClick={() => onChange(provider.id)}
            disabled={blocked}
            className={`rounded-xl border p-3 text-left transition ${
              blocked
                ? "cursor-not-allowed border-white/[0.05] bg-white/[0.01] opacity-45"
                : selected
                  ? "cursor-pointer border-violet-500/40 bg-violet-500/[0.08]"
                  : "cursor-pointer border-white/[0.07] bg-white/[0.02] hover:border-white/15"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={`text-sm font-bold ${selected ? "text-violet-300" : "text-white"}`}>
                {provider.label}
              </span>
              {provider.configured ? (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
              )}
            </span>
            <span className="mt-1 block font-mono text-[10px] text-gray-600">{provider.envKey}</span>
            <span className="mt-1 block text-[11px] leading-snug text-gray-500">
              {blocked
                ? "Não lê imagens"
                : provider.configured
                  ? `Chave presente · padrão ${provider.defaultModel}`
                  : "Chave ausente nesta instância"}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function AiAdminPage() {
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [draft, setDraft] = useState<AiSettingsPatch>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await getAiSettings()
      setSettings(data)
      setDraft({
        analysisProvider: data.analysis.provider,
        analysisModel: data.analysis.model ?? "",
        analysisFallbackModel: data.analysis.fallbackModel ?? "",
        scoreReaderProvider: data.scoreReader.provider,
        scoreReaderModel: data.scoreReader.model ?? "",
        scoreReadMode: data.scoreReader.mode,
        ocrLanguage: data.scoreReader.ocrLanguage,
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as configurações de IA")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading />
  if (error || !settings) return <ErrorState message={error || "Configuração indisponível"} retry={() => void load()} />

  const apply = async (input: AiSettingsPatch, message: string) => {
    setBusy(true)
    setError("")
    try {
      setSettings(await updateAiSettings(input))
      setNotice(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.")
    } finally {
      setBusy(false)
    }
  }

  const runTest = async () => {
    setTesting(true)
    setError("")
    try {
      const updated = await testAiConnection()
      setSettings(updated)
      setNotice(updated.lastCheckMessage ?? "Teste concluído.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível testar a conexão.")
    } finally {
      setTesting(false)
    }
  }

  const needsOcr = draft.scoreReadMode === "OCR_TEXT"

  return (
    <div className="space-y-6">
      <CompetitionHeader
        eyebrow="Administração"
        title="Inteligência artificial"
        subtitle="Escolha o provedor e o modelo de cada recurso. As chaves ficam nas variáveis de ambiente da API."
        icon={Brain}
        accent="text-violet-400"
        accentBg="bg-violet-500/10 border-violet-500/20"
        actions={
          <Button onClick={() => void runTest()} disabled={testing} variant="outline">
            {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 h-4 w-4" />}
            Testar conexão
          </Button>
        }
      />

      {notice && <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-gray-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-black text-white">Chaves configuradas nesta instância</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {settings.providers.map((provider) => (
            <div
              key={provider.id}
              className={`rounded-lg border px-3 py-2.5 ${
                provider.configured ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{provider.label}</span>
                <StatusPill tone={provider.configured ? "live" : "neutral"}>
                  {provider.configured ? "Pronta" : "Ausente"}
                </StatusPill>
              </div>
              <p className="mt-1 font-mono text-[10px] text-gray-500">{provider.envKey}</p>
              {!provider.configured && (
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-[11px] text-violet-400 hover:underline"
                >
                  Gerar chave
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-gray-600">
          A chave nunca passa pelo navegador nem fica no banco. Para trocar, edite a variável de ambiente na API e
          reinicie o serviço.
        </p>
      </Card>

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
          <span>
            <span className="block text-sm font-black text-white">Análises do LoL</span>
            <span className="block text-[11px] text-gray-500">
              Clash Scout, leitura de perfil e resumo das partidas. Desligado, tudo cai para o cálculo por estatística.
            </span>
          </span>
          <Switch
            checked={settings.analysis.enabled}
            disabled={busy}
            onCheckedChange={(checked) =>
              void apply({ analysisEnabled: checked }, checked ? "Análises ligadas." : "Análises desligadas.")
            }
          />
        </label>

        <div className="pt-4">
          <ProviderPicker
            providers={settings.providers}
            value={draft.analysisProvider ?? settings.analysis.provider}
            onChange={(provider) => setDraft({ ...draft, analysisProvider: provider })}
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="analysis-model">Modelo</Label>
              <Input
                id="analysis-model"
                value={draft.analysisModel ?? ""}
                onChange={(event) => setDraft({ ...draft, analysisModel: event.target.value })}
                placeholder={
                  settings.providers.find((item) => item.id === (draft.analysisProvider ?? settings.analysis.provider))
                    ?.defaultModel
                }
                className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="analysis-fallback">Modelo reserva</Label>
              <Input
                id="analysis-fallback"
                value={draft.analysisFallbackModel ?? ""}
                onChange={(event) => setDraft({ ...draft, analysisFallbackModel: event.target.value })}
                placeholder="usado quando o principal falha"
                className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                void apply(
                  {
                    analysisProvider: draft.analysisProvider,
                    analysisModel: draft.analysisModel || null,
                    analysisFallbackModel: draft.analysisFallbackModel || null,
                  },
                  "Provedor das análises salvo.",
                )
              }
              disabled={busy}
              className="bg-violet-500 text-white hover:bg-violet-400"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Salvar análises
            </Button>
            <StatusPill tone={settings.analysis.ready ? "live" : "warn"}>
              {settings.analysis.ready ? `Ativo em ${settings.analysis.effectiveModel}` : "Indisponível"}
            </StatusPill>
          </div>

          {settings.analysis.unavailableReason && (
            <p className="mt-2 text-[11px] text-amber-400">{settings.analysis.unavailableReason}</p>
          )}
        </div>
      </Card>

      <Card className="border-white/[0.07] bg-white/[0.025] p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
          <span>
            <span className="flex items-center gap-2 text-sm font-black text-white">
              <ScanLine className="h-4 w-4 text-violet-400" />
              Leitura de placar por foto
            </span>
            <span className="mt-0.5 block text-[11px] text-gray-500">
              Confere o print enviado nos campeonatos e na Liga Draft. Desligado, toda prova vai para aprovação manual.
            </span>
          </span>
          <Switch
            checked={settings.scoreReader.enabled}
            disabled={busy}
            onCheckedChange={(checked) =>
              void apply(
                { scoreReaderEnabled: checked },
                checked ? "Leitura de placar ligada." : "Leitura de placar desligada.",
              )
            }
          />
        </label>

        <div className="pt-4">
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {READ_MODES.map((mode) => {
              const selected = (draft.scoreReadMode ?? settings.scoreReader.mode) === mode.id
              return (
                <button
                  key={mode.id}
                  onClick={() => setDraft({ ...draft, scoreReadMode: mode.id })}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    selected ? "border-violet-500/40 bg-violet-500/[0.08]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <mode.icon className={`h-4 w-4 ${selected ? "text-violet-300" : "text-gray-500"}`} />
                    <span className={`text-sm font-bold ${selected ? "text-violet-300" : "text-white"}`}>
                      {mode.title}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-gray-500">{mode.hint}</span>
                </button>
              )
            })}
          </div>

          <ProviderPicker
            providers={settings.providers}
            value={draft.scoreReaderProvider ?? settings.scoreReader.provider}
            onChange={(provider) => setDraft({ ...draft, scoreReaderProvider: provider })}
            requireVision={(draft.scoreReadMode ?? settings.scoreReader.mode) === "VISION"}
          />

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="reader-model">Modelo</Label>
            <Input
              id="reader-model"
              value={draft.scoreReaderModel ?? ""}
              onChange={(event) => setDraft({ ...draft, scoreReaderModel: event.target.value })}
              placeholder={
                settings.providers.find(
                  (item) => item.id === (draft.scoreReaderProvider ?? settings.scoreReader.provider),
                )?.defaultModel
              }
              className="border-white/10 bg-white/[0.03] font-mono text-[12px]"
            />
          </div>

          {needsOcr && (
            <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
              <Label htmlFor="ocr-language">Idioma do OCR</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: "por", label: "Português" },
                  { code: "eng", label: "Inglês" },
                  { code: "spa", label: "Espanhol" },
                  { code: "por+eng", label: "Português e inglês" },
                ].map((option) => (
                  <button
                    key={option.code}
                    onClick={() => setDraft({ ...draft, ocrLanguage: option.code })}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      (draft.ocrLanguage ?? "por") === option.code
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                        : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-600">
                O OCR roda dentro da própria API, sem serviço externo nem chave. Na primeira leitura o modelo de idioma
                é baixado uma vez e fica em cache.
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                void apply(
                  {
                    scoreReaderProvider: draft.scoreReaderProvider,
                    scoreReaderModel: draft.scoreReaderModel || null,
                    scoreReadMode: draft.scoreReadMode,
                    ocrLanguage: draft.ocrLanguage,
                  },
                  "Leitura de placar salva.",
                )
              }
              disabled={busy}
              className="bg-violet-500 text-white hover:bg-violet-400"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Salvar leitura
            </Button>
            <StatusPill tone={settings.scoreReader.ready ? "live" : "warn"}>
              {settings.scoreReader.ready ? `Ativo em ${settings.scoreReader.effectiveModel}` : "Indisponível"}
            </StatusPill>
          </div>

          {settings.scoreReader.unavailableReason && (
            <p className="mt-2 text-[11px] text-amber-400">{settings.scoreReader.unavailableReason}</p>
          )}
        </div>
      </Card>

      {settings.lastCheckedAt && (
        <p className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          {settings.lastCheckOk ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-400" />
          )}
          Último teste em {formatDateTime(settings.lastCheckedAt)}. {settings.lastCheckMessage}
        </p>
      )}
    </div>
  )
}
