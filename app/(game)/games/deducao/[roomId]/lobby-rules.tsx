"use client"

import type { Snapshot } from "./use-deducao-room"

const RULES: { key: string; label: string; hint: string; min: number; max: number; step: number; defaultValue: number; unit?: string }[] = [
  { key: "killers", label: "Assassinos", hint: "Até 6 jogadores: 1. De 7 a 9: até 2. De 10 a 12: até 3.", min: 1, max: 3, step: 1, defaultValue: 1 },
  { key: "tasksPerPlayer", label: "Tarefas por jogador", hint: "Quantidade recebida por cada funcionário", min: 2, max: 8, step: 1, defaultValue: 4 },
  {
    key: "killCooldownMs", label: "Recarga de abate", hint: "Espera inicial, após reuniões e entre abates",
    min: 10000, max: 60000, step: 5000, defaultValue: 25000, unit: "s",
  },
  {
    key: "blackoutSeconds", label: "Duração do apagão", hint: "Poder do assassino. Recarga fixa de 40 s entre ativações.",
    min: 10, max: 60, step: 5, defaultValue: 25, unit: "s",
  },
  {
    key: "meetingSeconds", label: "Tempo de discussão", hint: "Conversa antes de abrir a votação",
    min: 15, max: 120, step: 5, defaultValue: 45, unit: "s",
  },
  {
    key: "voteSeconds", label: "Tempo de votação", hint: "Prazo máximo para votar em alguém ou pular",
    min: 15, max: 120, step: 5, defaultValue: 30, unit: "s",
  },
  {
    key: "emergencyPerPlayer", label: "Emergências por jogador", hint: "Chamadas pelo botão por partida. Zero desliga o botão, mas ainda permite reportar corpos.",
    min: 0, max: 3, step: 1, defaultValue: 1,
  },
  {
    key: "emergencyCooldownMs", label: "Recarga da emergência", hint: "Espera de todos no início e após cada reunião. Reportar corpos não tem essa espera.",
    min: 10000, max: 60000, step: 5000, defaultValue: 30000, unit: "s",
  },
]

const TOGGLES = [
  { key: "withDetective", label: "Detetive na partida", hint: "Investiga alguém por reunião e recebe a leitura na próxima", defaultValue: true },
  { key: "revealRoleOnEject", label: "Revelar papel de quem foi expulso", hint: "Mostra se a pessoa expulsa era assassina após a votação", defaultValue: true },
]

export function LobbyRules({ snapshot, isHost, onSend }: {
  snapshot: Snapshot
  isHost: boolean
  onSend: (type: string, payload?: unknown) => void
}) {
  const maxKillers = snapshot.players.length >= 10 ? 3 : snapshot.players.length >= 7 ? 2 : 1
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-400">Regras da partida</h2>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">Valem para todos. A qualidade gráfica é uma preferência individual, salva neste navegador.</p>
      <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {RULES.map((rule) => {
          const value = snapshot.config[rule.key]
          const max = rule.key === "killers" ? maxKillers : rule.max
          const raw = Math.min(max, Math.max(rule.min, typeof value === "number" && Number.isFinite(value) ? value : rule.defaultValue))
          const shown = rule.unit === "s" && rule.key.endsWith("Ms") ? raw / 1000 : raw
          const disabled = !isHost || (rule.key === "killers" && max === 1)
            || (rule.key === "emergencyCooldownMs" && snapshot.config.emergencyPerPlayer === 0)
          return (
            <div key={rule.key}>
              <label htmlFor={`rule-${rule.key}`} className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold text-zinc-200">{rule.label}</span>
                <span className="shrink-0 font-mono text-sm font-bold text-amber-300">{shown}{rule.unit ? ` ${rule.unit}` : ""}</span>
              </label>
              <input
                id={`rule-${rule.key}`}
                type="range"
                min={rule.min}
                max={max}
                step={rule.step}
                value={raw}
                disabled={disabled}
                aria-describedby={`hint-${rule.key}`}
                aria-valuetext={`${shown}${rule.unit ? ` ${rule.unit}` : ""}`}
                onChange={(event) => { if (!disabled) onSend("config", { [rule.key]: Number(event.target.value) }) }}
                className="mt-2 w-full cursor-pointer accent-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              />
              <p id={`hint-${rule.key}`} className="text-[11px] leading-relaxed text-zinc-400">{rule.hint}</p>
            </div>
          )
        })}
        {TOGGLES.map((rule) => (
          <label key={rule.key} className="flex cursor-pointer items-center justify-between gap-3 border-t border-white/[0.06] pt-3 sm:col-span-2">
            <span>
              <span className="block text-xs font-bold text-zinc-200">{rule.label}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-zinc-400">{rule.hint}</span>
            </span>
            <input
              type="checkbox"
              checked={typeof snapshot.config[rule.key] === "boolean" ? snapshot.config[rule.key] as boolean : rule.defaultValue}
              disabled={!isHost}
              onChange={(event) => { if (isHost) onSend("config", { [rule.key]: event.target.checked }) }}
              className="h-4 w-4 shrink-0 cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
            />
          </label>
        ))}
      </div>
      {!isHost && <p className="mt-3 text-[11px] text-zinc-400">Quem ajusta as regras é o anfitrião.</p>}
    </section>
  )
}
