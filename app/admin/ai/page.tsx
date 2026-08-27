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
  Sparkles,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorState, PageLoading, StatusPill, formatDateTime } from "@/components/competitions/shared"
import { AdminHeader, InlineNotice, SectionCard, adminTabClass, adminTabListClass } from "@/components/admin/shell"
import {
  getAiSettings,
  testAiConnection,
  updateAiSettings,
  type AiProvider,
  type AiSettings,
  type AiSettingsPatch,
  type EffortLevel,
  type ScoreReadMode,
  EFFORT_LEVELS,
} from "@/lib/services/ai-settings"
import { ChoiceChip, ModelField, ProviderPicker } from "./pickers"

const EFFORT_LABELS: Record<EffortLevel, string> = {
  minimal: "Mínimo",
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
}

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

const OCR_LANGUAGES = [
  { code: "por", label: "Português" },
  { code: "eng", label: "Inglês" },
  { code: "spa", label: "Espanhol" },
  { code: "por+eng", label: "Português e inglês" },
]

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
        analysisEffort: data.analysis.effort,
        analysisFallbackProvider: data.analysis.fallbackProvider,
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
  const analysisProvider = settings.providers.find(
    (provider) => provider.id === (draft.analysisProvider ?? settings.analysis.provider),
  )
  const fallbackId = draft.analysisFallbackProvider ?? null
  const fallbackProvider = settings.providers.find((provider) => provider.id === fallbackId)
  const readerProvider = settings.providers.find(
    (provider) => provider.id === (draft.scoreReaderProvider ?? settings.scoreReader.provider),
  )
  const configuredKeys = settings.providers.filter((provider) => provider.configured).length

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Integrações"
        title="Inteligência artificial"
        subtitle="Escolha o provedor e o modelo de cada recurso. As chaves ficam nas variáveis de ambiente da API."
        icon={Brain}
        accent="fuchsia"
        actions={
          <Button onClick={() => void runTest()} disabled={testing} variant="outline" className="border-white/10">
            {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 h-4 w-4" />}
            Testar conexão
          </Button>
        }
      />

      {notice && <InlineNotice tone="neutral">{notice}</InlineNotice>}
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      <Tabs defaultValue="analysis" className="gap-4">
        <TabsList className={adminTabListClass()}>
          <TabsTrigger value="analysis" className={adminTabClass("fuchsia")}>
            <Sparkles className="h-3.5 w-3.5" />
            Análises
          </TabsTrigger>
          <TabsTrigger value="reader" className={adminTabClass("fuchsia")}>
            <ScanLine className="h-3.5 w-3.5" />
            Leitura de placar
          </TabsTrigger>
          <TabsTrigger value="keys" className={adminTabClass("fuchsia")}>
            <KeyRound className="h-3.5 w-3.5" />
            Chaves e conexão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-3">
          <SectionCard
            icon={Sparkles}
            accent="fuchsia"
            title="Análises e catálogo"
            description="Clash Scout, leitura de perfil e resumo das partidas, mais os elencos e os atributos do catálogo de jogadores. Desligado, a análise cai para o cálculo por estatística e o catálogo perde a busca por IA."
            action={
              <Switch
                aria-label="Ligar as análises por IA"
                checked={settings.analysis.enabled}
                disabled={busy}
                onCheckedChange={(checked) =>
                  void apply({ analysisEnabled: checked }, checked ? "Análises ligadas." : "Análises desligadas.")
                }
              />
            }
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">Provedor</p>
                <ProviderPicker
                  providers={settings.providers}
                  value={draft.analysisProvider ?? settings.analysis.provider}
                  /// Nome de modelo não atravessa provedor: trocar de casa zera o
                  /// campo, e vazio quer dizer "o padrão de quem foi escolhido".
                  onChange={(provider: AiProvider) =>
                    setDraft({
                      ...draft,
                      analysisProvider: provider,
                      analysisModel: "",
                      ...(draft.analysisFallbackProvider === provider
                        ? { analysisFallbackProvider: null, analysisFallbackModel: "" }
                        : {}),
                    })
                  }
                />
              </div>

              <ModelField
                id="analysis-model"
                label="Modelo"
                models={analysisProvider?.models ?? []}
                placeholder={analysisProvider?.defaultModel}
                value={draft.analysisModel ?? ""}
                onChange={(model) => setDraft({ ...draft, analysisModel: model })}
              />

              <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
                <Button
                  onClick={() =>
                    void apply(
                      {
                        analysisProvider: draft.analysisProvider,
                        analysisModel: draft.analysisModel || null,
                        analysisEffort: draft.analysisEffort ?? null,
                        analysisFallbackProvider: draft.analysisFallbackProvider ?? null,
                        analysisFallbackModel: draft.analysisFallbackModel || null,
                      },
                      "Provedor das análises salvo.",
                    )
                  }
                  disabled={busy}
                  className="bg-fuchsia-600 text-white hover:bg-fuchsia-500"
                >
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Salvar análises
                </Button>
                <StatusPill tone={settings.analysis.ready ? "live" : "warn"}>
                  {settings.analysis.ready ? `Ativo em ${settings.analysis.effectiveModel}` : "Indisponível"}
                </StatusPill>
                {settings.analysis.effectiveEffort && (
                  <StatusPill tone="neutral">Esforço: {EFFORT_LABELS[settings.analysis.effectiveEffort]}</StatusPill>
                )}
                {settings.analysis.effectiveFallback && (
                  <StatusPill tone="neutral">Reserva: {settings.analysis.effectiveFallback}</StatusPill>
                )}
              </div>

              {settings.analysis.unavailableReason && (
                <InlineNotice tone="warn">{settings.analysis.unavailableReason}</InlineNotice>
              )}
            </div>
          </SectionCard>

          {analysisProvider?.supportsEffort && (
            <SectionCard
              icon={Brain}
              accent="fuchsia"
              title="Esforço de raciocínio"
              description="Quanto o modelo pensa antes de responder, na API Responses. Mais esforço custa mais tokens e demora mais. Para listar elenco e estimar atributo, o baixo costuma bastar. Salve pelo botão das análises."
            >
              <div className="flex flex-wrap gap-1.5">
                {([null, ...EFFORT_LEVELS] as Array<EffortLevel | null>).map((level) => (
                  <ChoiceChip
                    key={level ?? "padrao"}
                    selected={(draft.analysisEffort ?? null) === level}
                    onClick={() => setDraft({ ...draft, analysisEffort: level })}
                  >
                    {level ? EFFORT_LABELS[level] : "Padrão do provedor"}
                  </ChoiceChip>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard
            icon={PlugZap}
            accent="fuchsia"
            title="Provedor reserva"
            description="Quando o principal falha, a chamada vai para outra empresa. Cair para outro modelo da mesma casa não adianta: chave recusada, cota estourada e provedor fora do ar derrubam todos os modelos dela junto."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <ChoiceChip selected={!fallbackId} onClick={() => setDraft({ ...draft, analysisFallbackProvider: null })}>
                  Sem reserva
                </ChoiceChip>
                {settings.providers
                  .filter((provider) => provider.id !== (draft.analysisProvider ?? settings.analysis.provider))
                  .map((provider) => (
                    <ChoiceChip
                      key={provider.id}
                      selected={fallbackId === provider.id}
                      disabled={!provider.configured}
                      onClick={() => setDraft({ ...draft, analysisFallbackProvider: provider.id })}
                    >
                      {provider.label}
                      {!provider.configured && " (sem chave)"}
                    </ChoiceChip>
                  ))}
              </div>

              {fallbackProvider && (
                <ModelField
                  id="analysis-fallback"
                  label={`Modelo no ${fallbackProvider.label}`}
                  models={fallbackProvider.models}
                  placeholder={fallbackProvider.defaultModel}
                  value={draft.analysisFallbackModel ?? ""}
                  onChange={(model) => setDraft({ ...draft, analysisFallbackModel: model })}
                />
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="reader" className="space-y-3">
          <SectionCard
            icon={ScanLine}
            accent="fuchsia"
            title="Leitura de placar por foto"
            description="Confere o print enviado nos campeonatos e na Liga Draft. Desligado, toda prova vai para aprovação manual."
            action={
              <Switch
                aria-label="Ligar a leitura de placar por foto"
                checked={settings.scoreReader.enabled}
                disabled={busy}
                onCheckedChange={(checked) =>
                  void apply(
                    { scoreReaderEnabled: checked },
                    checked ? "Leitura de placar ligada." : "Leitura de placar desligada.",
                  )
                }
              />
            }
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Como a imagem é lida
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {READ_MODES.map((mode) => {
                    const selected = (draft.scoreReadMode ?? settings.scoreReader.mode) === mode.id
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setDraft({ ...draft, scoreReadMode: mode.id })}
                        className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-fuchsia-500/40 bg-fuchsia-500/[0.08]"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <mode.icon className={`h-4 w-4 ${selected ? "text-fuchsia-300" : "text-gray-500"}`} />
                          <span className={`text-sm font-bold ${selected ? "text-fuchsia-300" : "text-white"}`}>
                            {mode.title}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-snug text-gray-500">{mode.hint}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">Provedor</p>
                <ProviderPicker
                  providers={settings.providers}
                  value={draft.scoreReaderProvider ?? settings.scoreReader.provider}
                  onChange={(provider: AiProvider) =>
                    setDraft({ ...draft, scoreReaderProvider: provider, scoreReaderModel: "" })
                  }
                  requireVision={(draft.scoreReadMode ?? settings.scoreReader.mode) === "VISION"}
                />
              </div>

              <ModelField
                id="reader-model"
                label="Modelo"
                models={readerProvider?.models ?? []}
                placeholder={readerProvider?.defaultModel}
                value={draft.scoreReaderModel ?? ""}
                onChange={(model) => setDraft({ ...draft, scoreReaderModel: model })}
              />

              {needsOcr && (
                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <Label className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
                    Idioma do OCR
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {OCR_LANGUAGES.map((option) => (
                      <ChoiceChip
                        key={option.code}
                        selected={(draft.ocrLanguage ?? "por") === option.code}
                        onClick={() => setDraft({ ...draft, ocrLanguage: option.code })}
                      >
                        {option.label}
                      </ChoiceChip>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-600">
                    O OCR roda dentro da própria API, sem serviço externo nem chave. Na primeira leitura o modelo de
                    idioma é baixado uma vez e fica em cache.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
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
                  className="bg-fuchsia-600 text-white hover:bg-fuchsia-500"
                >
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Salvar leitura
                </Button>
                <StatusPill tone={settings.scoreReader.ready ? "live" : "warn"}>
                  {settings.scoreReader.ready ? `Ativo em ${settings.scoreReader.effectiveModel}` : "Indisponível"}
                </StatusPill>
              </div>

              {settings.scoreReader.unavailableReason && (
                <InlineNotice tone="warn">{settings.scoreReader.unavailableReason}</InlineNotice>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="keys" className="space-y-3">
          <SectionCard
            icon={KeyRound}
            accent="fuchsia"
            title="Chaves desta instância"
            description="A chave nunca passa pelo navegador nem fica no banco. Para trocar, edite a variável de ambiente na API e reinicie o serviço."
            aside={
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] font-black text-gray-400">
                {configuredKeys} de {settings.providers.length} prontas
              </span>
            }
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {settings.providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`rounded-xl border px-3.5 py-3 ${
                    provider.configured
                      ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                      : "border-white/[0.07] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{provider.label}</span>
                    <StatusPill tone={provider.configured ? "live" : "neutral"}>
                      {provider.configured ? "Pronta" : "Ausente"}
                    </StatusPill>
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-gray-500">{provider.envKey}</p>
                  {!provider.configured && (
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 flex items-center gap-1 text-[11px] text-fuchsia-400 hover:underline"
                    >
                      Gerar chave
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            icon={PlugZap}
            accent="fuchsia"
            title="Último teste de conexão"
            description="O teste chama o provedor escolhido com uma pergunta mínima e conta o que voltou."
            action={
              <Button onClick={() => void runTest()} disabled={testing} variant="outline" className="border-white/10">
                {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 h-4 w-4" />}
                Testar agora
              </Button>
            }
          >
            {settings.lastCheckedAt ? (
              <p className="flex flex-wrap items-center gap-2 text-[12px] text-gray-400">
                {settings.lastCheckOk ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="font-bold text-white">{formatDateTime(settings.lastCheckedAt)}</span>
                <span>{settings.lastCheckMessage}</span>
              </p>
            ) : (
              <p className="text-[12px] text-gray-500">Ninguém testou a conexão nesta instância ainda.</p>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
