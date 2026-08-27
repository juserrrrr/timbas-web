"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Lock, Save, Server, Trash2, TriangleAlert, Zap } from "lucide-react"
import { toast } from "@/lib/toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { InlineNotice, SectionCard } from "@/components/admin/shell"
import { getToken } from "@/lib/auth"
import { clearSfuSettings, getSfuStatus, saveSfuSettings, testSfuConnection, type SfuStatus } from "@/lib/services/streaming"

const FIELD_CLASS = "h-10 border-white/[0.09] bg-black/25 text-white placeholder:text-gray-600 focus-visible:border-rose-500/40"

/**
 * Credentials for the self hosted LiveKit server. Kept in the panel instead of
 * environment variables so switching the lives between peer to peer and the
 * server does not need a redeploy.
 */
export function SfuPanel({ onStatus }: { onStatus?: (status: SfuStatus) => void }) {
  const [status, setStatus] = useState<SfuStatus | null>(null)
  const [url, setUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [clearing, setClearing] = useState(false)

  // A página de cima só quer o resumo para o topo. Guardar o callback numa ref
  // evita refazer a busca a cada render dela.
  const report = useRef(onStatus)
  report.current = onStatus

  const apply = (next: SfuStatus) => {
    setStatus(next)
    setUrl(next.url)
    setApiKey(next.apiKey)
    setApiSecret("")
    report.current?.(next)
  }

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getSfuStatus(token)
      .then(apply)
      .catch((error: unknown) =>
        toast.error("Erro ao carregar o servidor de transmissão", {
          description: error instanceof Error ? error.message : undefined,
        }),
      )
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    const token = getToken()
    if (!token) return
    if (!url.trim() || !apiKey.trim()) {
      toast.error("Preencha a URL e a chave antes de salvar")
      return
    }
    if (!status?.hasSecret && !apiSecret.trim()) {
      toast.error("O segredo é obrigatório na primeira vez")
      return
    }

    setSaving(true)
    try {
      apply(await saveSfuSettings(token, { url: url.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() || undefined }))
      toast.success("Configuração salva", { description: "Ligue o recurso live_sfu para as lives passarem a usar o servidor." })
    } catch (error: unknown) {
      toast.error("Erro ao salvar", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    const token = getToken()
    if (!token) return
    setTesting(true)
    try {
      const result = await testSfuConnection(token)
      if (result.ok) toast.success("Servidor respondeu", { description: result.message })
      else toast.error("Sem resposta do servidor", { description: result.message })
    } catch (error: unknown) {
      toast.error("Erro no teste", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setTesting(false)
    }
  }

  const clear = async () => {
    const token = getToken()
    if (!token) return
    setClearing(true)
    try {
      apply(await clearSfuSettings(token))
      toast.success("Configuração apagada", { description: "As lives voltaram para o modo ponto a ponto." })
    } catch (error: unknown) {
      toast.error("Erro ao apagar", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-3">
      <SectionCard
        icon={Server}
        accent="rose"
        title="Servidor de transmissão (SFU)"
        description="Sem ele, quem transmite envia uma cópia do vídeo para cada pessoa que assiste, e a qualidade cai conforme a sala enche. Com ele, sobe uma cópia só e o servidor distribui."
        aside={status ? <StatusBadge status={status} /> : undefined}
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="size-5 text-rose-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {status?.source === "environment" && (
              <InlineNotice tone="warn" icon={TriangleAlert}>
                Hoje a configuração vem das variáveis de ambiente da API. O que você salvar aqui passa a valer no lugar
                delas.
              </InlineNotice>
            )}
            {status && !status.encryption.active && (
              <InlineNotice tone="warn" icon={TriangleAlert}>
                A API está sem chave de criptografia, então o segredo fica em texto puro no banco. Defina{" "}
                <span className="font-mono">JWT_SECRET</span> (ou{" "}
                <span className="font-mono">SETTINGS_ENCRYPTION_KEY</span>) e salve de novo.
              </InlineNotice>
            )}
            {status?.configured && !status.featureEnabled && (
              <InlineNotice tone="warn" icon={TriangleAlert}>
                O servidor está configurado, mas o recurso <span className="font-mono">live_sfu</span> está desligado,
                então as lives continuam no modo ponto a ponto.
              </InlineNotice>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sfu-url" className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
                  URL do servidor
                </Label>
                <Input
                  id="sfu-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="wss://livekit.seudominio.com"
                  className={`${FIELD_CLASS} font-mono text-[12px]`}
                />
                <p className="text-[11px] text-gray-600">O endereço que o navegador abre. Precisa começar com wss://.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sfu-key" className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Chave (API key)
                </Label>
                <Input
                  id="sfu-key"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="timbas"
                  className={`${FIELD_CLASS} font-mono text-[12px]`}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sfu-secret" className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Segredo (API secret)
                </Label>
                <Input
                  id="sfu-secret"
                  type="password"
                  value={apiSecret}
                  onChange={(event) => setApiSecret(event.target.value)}
                  placeholder={status?.hasSecret ? "Guardado. Preencha só para trocar." : "openssl rand -hex 32"}
                  className={FIELD_CLASS}
                />
                <p className="flex items-center gap-1 text-[11px] text-gray-600">
                  {status?.encryption.active && <Lock className="h-3 w-3 text-emerald-400/80" />}
                  {status?.encryption.active
                    ? "Cifrado no banco. Nunca volta para a tela."
                    : "Nunca volta para a tela depois de salvo."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
              <button
                onClick={() => {
                  void save()
                }}
                disabled={saving}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition-colors hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </button>
              <button
                onClick={() => {
                  void test()
                }}
                disabled={testing || !status?.configured}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white/[0.05] px-4 text-sm font-bold text-gray-200 ring-1 ring-white/[0.09] transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Testar conexão
              </button>
              {status?.source === "database" && (
                <button
                  onClick={() => {
                    void clear()
                  }}
                  disabled={clearing}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white/[0.03] px-4 text-sm font-bold text-gray-400 ring-1 ring-white/[0.08] transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar
                </button>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {status?.encryption.active && <EncryptionNote encryption={status.encryption} />}

      {!loading && (
        <p className="px-1 text-[11px] leading-relaxed text-gray-600">
          Como subir o servidor no Coolify e quais portas abrir na Contabo está em{" "}
          <span className="font-mono">docs/LIVEKIT.md</span> no repositório da API. Se o teste passar mas a imagem não
          aparecer para quem assiste, é firewall de UDP: confira a 7882/udp.
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: SfuStatus }) {
  if (status.enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/25">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ativo
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-gray-400 ring-1 ring-white/[0.08]">
      <TriangleAlert className="h-3.5 w-3.5 text-amber-300" />
      {status.configured ? "Configurado, mas desligado" : "Não configurado"}
    </span>
  )
}

function EncryptionNote({ encryption }: { encryption: SfuStatus["encryption"] }) {
  return (
    <SectionCard
      icon={Lock}
      accent="emerald"
      title="Segredo cifrado com AES-256-GCM"
      description={
        encryption.fallbackKeys > 0
          ? `${encryption.fallbackKeys} chave(s) antiga(s) ainda são aceitas na leitura.`
          : undefined
      }
    >
      <p className="text-[11.5px] leading-relaxed text-gray-500">
        Um dump do banco sozinho não entrega nada. Quem tiver o servidor da API continua tendo acesso, porque a chave
        mora lá.
        {encryption.dedicatedKey ? (
          <>
            {" "}
            A chave é dedicada (<span className="font-mono">SETTINGS_ENCRYPTION_KEY</span>).
          </>
        ) : (
          <>
            {" "}
            Hoje a chave é derivada do <span className="font-mono">JWT_SECRET</span>. Funciona, mas trocar o JWT torna
            este segredo ilegível. Para separar as duas coisas, defina{" "}
            <span className="font-mono">SETTINGS_ENCRYPTION_KEY</span> na API: o que já está salvo migra sozinho na
            próxima leitura.
          </>
        )}
      </p>
    </SectionCard>
  )
}
