"use client"

import { CheckCircle2, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AiProvider, AiSettings } from "@/lib/services/ai-settings"

/// Select com os modelos que sabemos que funcionam, sem travar: dá para digitar
/// outro, porque provedor lança modelo novo toda semana.
export function ModelField({
  id,
  label,
  models,
  placeholder,
  value,
  onChange,
}: {
  id: string
  label: string
  models: string[]
  placeholder?: string
  value: string
  onChange: (model: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
        {label}
      </Label>
      <Input
        id={id}
        list={`${id}-options`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 border-white/10 bg-black/25 font-mono text-[12px]"
      />
      <datalist id={`${id}-options`}>
        {models.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
      {value.trim() !== "" && !models.includes(value.trim()) && (
        <p className="text-[11px] text-amber-400">
          Esse modelo não está na lista deste provedor. Se o nome estiver errado, a chamada volta com erro.
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {models.map((model) => (
          <button
            key={model}
            onClick={() => onChange(model)}
            className={`cursor-pointer rounded-full border px-2 py-0.5 font-mono text-[10px] transition ${
              value === model
                ? "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300"
                : "border-white/10 text-gray-500 hover:text-gray-300"
            }`}
          >
            {model}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProviderPicker({
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
                  ? "cursor-pointer border-fuchsia-500/40 bg-fuchsia-500/[0.08]"
                  : "cursor-pointer border-white/[0.07] bg-white/[0.02] hover:border-white/15"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={`text-sm font-bold ${selected ? "text-fuchsia-300" : "text-white"}`}>
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

/// Pílula de escolha única. Repete em esforço de raciocínio, provedor reserva e
/// idioma do OCR, então vale ter um componente só.
export function ChoiceChip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
        disabled
          ? "cursor-not-allowed border-white/[0.05] text-gray-700"
          : selected
            ? "cursor-pointer border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300"
            : "cursor-pointer border-white/10 text-gray-500 hover:text-gray-300"
      }`}
    >
      {children}
    </button>
  )
}
