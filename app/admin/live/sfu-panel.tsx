"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Lock, Save, Server, Trash2, TriangleAlert, Zap } from "lucide-react"
import { toast } from "@/lib/toast"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { getToken } from "@/lib/auth"
import { clearSfuSettings, getSfuStatus, saveSfuSettings, testSfuConnection, type SfuStatus } from "@/lib/services/streaming"

const FIELD_CLASS = "border-white/[0.09] bg-white/[0.03] text-white placeholder:text-gray-600 focus-visible:border-red-500/40"

/**
 * Credentials for the self hosted LiveKit server. Kept in the panel instead of
 * environment variables so switching the lives between peer to peer and the
 * server does not need a redeploy.
 */
export function SfuPanel() {
  const [status, setStatus] = useState<SfuStatus | null>(null)
  const [url, setUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [clearing, setClearing] = useState(false)

  const apply = (next: SfuStatus) => {
    setStatus(next)
    setUrl(next.url)
    setApiKey(next.apiKey)
    setApiSecret("")
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
      toast.success("Configuração salva", { description: "Ligue a flag live_sfu em Recursos para as lives passarem a usar o servidor." })
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
    <Card className="border-white/[0.06] bg-white/[0.02] p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
            <Server className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold leading-tight text-white">Servidor de transmissão (SFU)</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-gray-500">
              Sem ele, quem transmite envia uma cópia do vídeo para cada pessoa que assiste, e a qualidade cai conforme a sala enche.
              Com ele, sobe uma cópia só e o servidor distribui.
            </p>
          </div>
        </div>
        {status && <StatusBadge status={status} />}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="size-5 text-violet-400" /></div>
      ) : (
        <div className="space-y-4 px-5 py-5">
          {status?.source === "environment" && (
            <Notice tone="amber">
              Hoje a configuração vem das variáveis de ambiente da API. O que você salvar aqui passa a valer no lugar delas.
            </Notice>
          )}
          {status && !status.encryption.active && (
            <Notice tone="amber">
              A API está sem chave de criptografia, então o segredo fica em texto puro no banco. Defina <span className="font-mono">JWT_SECRET</span> (ou <span className="font-mono">SETTINGS_ENCRYPTION_KEY</span>) e salve de novo.
            </Notice>
          )}
          {status?.configured && !status.featureEnabled && (
            <Notice tone="amber">
              O servidor está configurado, mas a flag <span className="font-mono">live_sfu</span> está desligada em Recursos, então as lives continuam no modo ponto a ponto.
            </Notice>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sfu-url">URL do servidor</Label>
              <Input
                id="sfu-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="wss://livekit.seudominio.com"
                className={FIELD_CLASS}
              />
              <p className="text-[11px] text-gray-600">O endereço que o navegador abre. Precisa começar com wss://.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sfu-key">Chave (API key)</Label>
              <Input
                id="sfu-key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="timbas"
                className={FIELD_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sfu-secret">Segredo (API secret)</Label>
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
                {status?.encryption.active ? "Cifrado no banco. Nunca volta para a tela." : "Nunca volta para a tela depois de salvo."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { void save() }}
              disabled={saving}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
            <button
              onClick={() => { void test() }}
              disabled={testing || !status?.configured}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white/[0.05] px-4 text-sm font-bold text-gray-200 ring-1 ring-white/[0.09] transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Testar conexão
            </button>
            {status?.source === "database" && (
              <button
                onClick={() => { void clear() }}
                disabled={clearing}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white/[0.03] px-4 text-sm font-bold text-gray-400 ring-1 ring-white/[0.08] transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Apagar
              </button>
            )}
          </div>

          {status?.encryption.active && <EncryptionNote encryption={status.encryption} />}

          <p className="text-[11px] leading-relaxed text-gray-600">
            Como subir o servidor no Coolify e quais portas abrir na Contabo está em <span className="font-mono">docs/LIVEKIT.md</span> no repositório da API.
            Se o teste passar mas a imagem não aparecer para quem assiste, é firewall de UDP: confira a 7882/udp.
          </p>
        </div>
      )}
    </Card>
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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
        <Lock className="h-3 w-3" />
        Segredo cifrado com AES-256-GCM
        {encryption.fallbackKeys > 0 && (
          <span className="font-normal text-gray-500">
            · {encryption.fallbackKeys} chave(s) antiga(s) ainda aceita(s)
          </span>
        )}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
        Um dump do banco sozinho não entrega nada. Quem tiver o servidor da API continua tendo acesso, porque a chave mora lá.
        {encryption.dedicatedKey ? (
          <> A chave é dedicada (<span className="font-mono">SETTINGS_ENCRYPTION_KEY</span>).</>
        ) : (
          <>
            {" "}Hoje a chave é derivada do <span className="font-mono">JWT_SECRET</span>. Funciona, mas trocar o JWT torna este segredo ilegível.
            Para separar as duas coisas, defina <span className="font-mono">SETTINGS_ENCRYPTION_KEY</span> na API: o que já está salvo migra sozinho na próxima leitura.
          </>
        )}
      </p>
    </div>
  )
}

function Notice({ tone, children }: { tone: "amber"; children: React.ReactNode }) {
  return (
    <div className={`flex gap-2.5 rounded-xl border p-3 ${tone === "amber" ? "border-amber-500/20 bg-amber-500/[0.06]" : ""}`}>
      <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
      <p className="text-[11px] leading-relaxed text-gray-300">{children}</p>
    </div>
  )
}
