"use client"

import { Mic, MicOff } from "lucide-react"
import type { VoiceControls } from "./use-proximity-voice"

export function MicrophoneToggle({ voice }: { voice: VoiceControls }) {
  return (
    <div className="text-center">
      <button
        type="button"
        disabled={voice.busy}
        aria-pressed={voice.configured && !voice.enabled}
        title={voice.enabled ? "Silenciar sua voz" : voice.configured ? "Você continua ouvindo mesmo silenciado" : "Permitir o acesso ao microfone"}
        onClick={() => {
          if (voice.busy) return
          if (voice.configured) voice.toggle()
          else voice.configure()
        }}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 disabled:cursor-wait disabled:opacity-50"
      >
        {voice.enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        {voice.busy ? "Conectando microfone…" : !voice.configured && voice.error ? "Tentar microfone novamente" : voice.enabled ? "Silenciar microfone" : "Ativar microfone"}
      </button>
      {voice.error && (
        <div className="mx-auto mt-2 max-w-sm text-xs text-red-300">
          <p role="alert">{voice.error}</p>
          {voice.configured && <button type="button" disabled={voice.busy} onClick={() => { if (!voice.busy) voice.configure(voice.selectedDeviceId || undefined) }} className="mt-1 cursor-pointer underline underline-offset-2 disabled:cursor-wait disabled:opacity-50">Tentar novamente</button>}
        </div>
      )}
    </div>
  )
}

export function MicrophoneSetup({ voice, serverReady }: { voice: VoiceControls; serverReady: boolean }) {
  return (
    <section aria-labelledby="microphone-setup-title" className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <Mic className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <h2 id="microphone-setup-title" className="text-sm font-bold text-zinc-100">Seu microfone</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Permita e escolha um microfone antes de marcar Pronto. Depois, você pode deixá-lo silenciado.
          </p>
        </div>
      </div>

      {voice.configured ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-semibold text-zinc-300">
            Microfone selecionado
            <select
              value={voice.selectedDeviceId}
              disabled={voice.busy}
              onChange={(event) => voice.configure(event.target.value || undefined)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 focus:border-amber-400/50 focus:outline-none disabled:opacity-50"
            >
              <option value="">Padrão do sistema</option>
              {voice.selectedDeviceId && !voice.devices.some((device) => device.deviceId === voice.selectedDeviceId) && (
                <option value={voice.selectedDeviceId}>Microfone atual</option>
              )}
              {voice.devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || `Microfone ${index + 1}`}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={voice.busy}
            aria-pressed={!voice.enabled}
            onClick={voice.toggle}
            className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-amber-400/40 disabled:cursor-wait disabled:opacity-50"
          >
            {voice.enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {voice.enabled ? "Silenciar" : "Ativar microfone"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={voice.busy}
          onClick={() => voice.configure()}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-50 sm:w-auto"
        >
          <Mic className="h-4 w-4" />
          {voice.busy ? "Aguardando permissão…" : voice.error ? "Tentar novamente" : "Permitir microfone"}
        </button>
      )}

      <p role="status" className={`mt-3 text-xs ${voice.configured && serverReady ? "text-emerald-300" : "text-zinc-400"}`}>
        {voice.busy ? "Configurando o microfone…"
          : !voice.configured ? "O navegador só pedirá acesso quando você clicar."
            : !serverReady ? "Confirmando o microfone na sala…"
              : voice.enabled ? "Microfone pronto e ligado."
                : "Microfone pronto e silenciado. Você já pode marcar Pronto."}
      </p>
      {voice.error && <p role="alert" className="mt-2 text-xs leading-relaxed text-red-300">{voice.error}</p>}
    </section>
  )
}
