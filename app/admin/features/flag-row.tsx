"use client"

import { Switch } from "@/components/ui/switch"
import { ADMIN_ACCENTS, type AdminAccent } from "@/components/admin/shell"
import { featureMeta } from "@/lib/admin/feature-catalog"
import type { FeatureFlag } from "@/lib/services/feature-flags"
import { formatFlagUpdatedAt } from "./use-feature-flags"

/// Uma linha por recurso: o nome que a pessoa reconhece na frente, a chave
/// técnica embaixo para quem for procurar no código, e a chave de liga e
/// desliga sempre no mesmo lugar da direita.
export function FlagRow({
  flag,
  accent,
  busy,
  onToggle,
}: {
  flag: FeatureFlag
  accent: AdminAccent
  busy: boolean
  onToggle: (enabled: boolean) => void
}) {
  const meta = featureMeta(flag)
  const tone = ADMIN_ACCENTS[accent]

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.015]">
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${
          flag.enabled ? tone.chip : "border-white/[0.07] bg-white/[0.02] text-gray-600"
        }`}
      >
        <meta.icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-[200px] flex-1">
        <p className="text-[13px] font-black leading-tight text-white">{meta.label}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-gray-500">{meta.hint}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-600">
          <code className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-gray-500">{flag.key}</code>
          <span>{formatFlagUpdatedAt(flag.updatedAt)}</span>
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <span
          className={`w-20 text-right text-[11px] font-black uppercase tracking-wider ${
            flag.enabled ? "text-emerald-400" : "text-gray-600"
          }`}
        >
          {flag.enabled ? "Ligado" : "Desligado"}
        </span>
        <Switch
          checked={flag.enabled}
          disabled={busy}
          onCheckedChange={onToggle}
          aria-label={meta.label}
          className="cursor-pointer data-[state=checked]:bg-emerald-600"
        />
      </div>
    </div>
  )
}

/// Barra fininha de proporção. Aparece no card de categoria e no topo da
/// categoria aberta, sempre com o mesmo significado: quanto daquele assunto
/// está no ar.
export function FlagMeter({ on, total, accent }: { on: number; total: number; accent: AdminAccent }) {
  const percent = total > 0 ? Math.round((on / total) * 100) : 0
  return (
    <span className="block h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <span
        className={`block h-full rounded-full transition-all duration-500 ${ADMIN_ACCENTS[accent].bar}`}
        style={{ width: `${percent}%` }}
      />
    </span>
  )
}
