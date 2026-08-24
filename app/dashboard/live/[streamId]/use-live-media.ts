"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { VideoProfile } from "@/lib/live/tuning"
import {
  captureDeviceAudio,
  captureDisplay,
  captureMicrophone,
  captureScreenAudio,
  isLoopbackDevice,
  listAudioInputs,
  stopCapture,
  type AudioCapture,
  type DisplayCapture,
  type DisplaySurface,
} from "@/lib/live/capture"
import { createAudioMixer, type AudioMixerLevels, type AudioSourceKind, type LiveAudioMixer } from "@/lib/live/audio-mixer"

export type GameAudioState = "off" | "connecting" | "live" | "silent" | "unavailable"

export interface ScreenInfo {
  label: string
  surface: DisplaySurface
}

const SILENCE_GRACE_MS = 6000

/**
 * Everything the host's machine does before the media leaves the browser:
 * screen capture, microphone, game audio and the mixer that merges them.
 *
 * It is transport agnostic on purpose. Both the peer to peer path and the SFU
 * path drive the same capture rules, including the awkward part: Chrome never
 * attaches audio to a captured window, so the sound has to come from somewhere
 * else and that fallback logic must not exist in two copies.
 */
export function useLiveMedia(monitor: boolean, onVideoTrack: (track: MediaStreamTrack | null) => void) {
  const previewRef = useRef<HTMLVideoElement>(null)
  const displayRef = useRef<DisplayCapture | null>(null)
  const gameAudioRef = useRef<AudioCapture | null>(null)
  const micRef = useRef<MediaStream | null>(null)
  const mixerRef = useRef<LiveAudioMixer | null>(null)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)
  const loudAtRef = useRef(0)
  const publishRef = useRef(onVideoTrack)
  publishRef.current = onVideoTrack

  const [sharing, setSharing] = useState(false)
  const [screen, setScreen] = useState<ScreenInfo | null>(null)
  const [micReady, setMicReady] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  const [gameAudioState, setGameAudioState] = useState<GameAudioState>("off")
  const [gameAudioLabel, setGameAudioLabel] = useState("")
  const [gameAudioBusy, setGameAudioBusy] = useState(false)
  const [levels, setLevels] = useState<AudioMixerLevels>({ game: 0, mic: 0 })
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])

  const ensureMixer = useCallback(() => {
    if (!mixerRef.current) mixerRef.current = createAudioMixer()
    return mixerRef.current
  }, [])

  const showPreview = useCallback((track: MediaStreamTrack | null) => {
    if (!previewRef.current) return
    previewRef.current.srcObject = track ? new MediaStream([track]) : null
  }, [])

  const publishVideo = useCallback((track: MediaStreamTrack | null) => {
    videoTrackRef.current = track
    publishRef.current(track)
  }, [])

  // ─── AUDIO ─────────────────────────────────────────────────────────────────

  /**
   * When the sound comes from the screen capture itself, its stream is also the
   * one carrying the picture, so only the audio track may be stopped.
   */
  const releaseGameAudio = useCallback(() => {
    const capture = gameAudioRef.current
    gameAudioRef.current = null
    if (!capture) return
    if (displayRef.current?.stream === capture.stream) capture.track.stop()
    else stopCapture(capture)
  }, [])

  const attachGameAudio = useCallback((capture: AudioCapture) => {
    const mixer = ensureMixer()
    const previous = gameAudioRef.current
    if (previous && previous !== capture) releaseGameAudio()
    gameAudioRef.current = capture
    mixer.setSource("game", capture.stream)
    setGameAudioLabel(capture.label)
    setGameAudioState("live")
    loudAtRef.current = Date.now()

    capture.track.addEventListener("ended", () => {
      if (gameAudioRef.current !== capture) return
      gameAudioRef.current = null
      mixerRef.current?.setSource("game", null)
      setGameAudioState("off")
      setGameAudioLabel("")
      toast.warning("O áudio do jogo foi desconectado", { description: "A imagem continua no ar. Reconecte o áudio quando quiser." })
    })
  }, [ensureMixer, releaseGameAudio])

  const connectGameAudio = useCallback(async (deviceId?: string) => {
    if (gameAudioBusy) return
    ensureMixer().resume()
    setGameAudioBusy(true)
    setGameAudioState("connecting")
    try {
      if (deviceId) {
        const device = audioInputs.find((item) => item.deviceId === deviceId)
        attachGameAudio(await captureDeviceAudio(deviceId, device?.label ?? ""))
        toast.success("Áudio conectado", { description: device?.label || "Entrada do Windows" })
        return
      }

      attachGameAudio(await captureScreenAudio())
      toast.success("Áudio do PC conectado", { description: "A imagem da live continua sendo a janela escolhida." })
    } catch (caught: unknown) {
      const cancelled = caught instanceof Error && caught.name === "NotAllowedError"
      setGameAudioState(gameAudioRef.current ? "live" : cancelled ? "off" : "unavailable")
      if (!cancelled) {
        toast.error("Não foi possível pegar o áudio do PC", {
          description: "Ao escolher a tela, marque Compartilhar áudio do sistema. Ou ative a Mixagem estéreo do Windows e selecione ela na lista.",
        })
      }
    } finally {
      setGameAudioBusy(false)
    }
  }, [attachGameAudio, audioInputs, ensureMixer, gameAudioBusy])

  const disconnectGameAudio = useCallback(() => {
    releaseGameAudio()
    mixerRef.current?.setSource("game", null)
    setGameAudioState("off")
    setGameAudioLabel("")
  }, [releaseGameAudio])

  const enableMic = useCallback(async () => {
    if (micBusy) return
    setMicBusy(true)
    try {
      const mic = await captureMicrophone()
      const mixer = ensureMixer()
      micRef.current = mic
      mixer.setSource("mic", mic)
      mixer.setMuted("mic", false)
      setMicReady(true)
      setMicOn(true)
    } catch {
      toast.error("Não foi possível ativar o microfone", { description: "Confira a permissão do navegador e tente de novo." })
    } finally {
      setMicBusy(false)
    }
  }, [ensureMixer, micBusy])

  const toggleMic = useCallback(async () => {
    ensureMixer().resume()
    if (!micRef.current) {
      await enableMic()
      return
    }
    const next = !micOn
    mixerRef.current?.setMuted("mic", !next)
    setMicOn(next)
  }, [enableMic, ensureMixer, micOn])

  const setVolume = useCallback((kind: AudioSourceKind, volume: number) => {
    mixerRef.current?.setVolume(kind, volume)
  }, [])

  // ─── CAPTURE ───────────────────────────────────────────────────────────────

  const pauseSharing = useCallback((capture: DisplayCapture) => {
    if (displayRef.current !== capture) return
    capture.video.stop()
    displayRef.current = null
    // Publishing nothing freezes the last frame for the viewers and marks the
    // track as muted, which reads far better than a black picture.
    publishVideo(null)
    showPreview(null)
    setSharing(false)
    setScreen(null)
    toast.info("Compartilhamento pausado", { description: "A live continua aberta. Escolha outra tela quando quiser." })
  }, [publishVideo, showPreview])

  const adoptDisplay = useCallback(async (capture: DisplayCapture, wantGameAudio: boolean) => {
    displayRef.current = capture
    showPreview(capture.video)
    setScreen({ label: capture.label, surface: capture.surface })
    setSharing(true)
    capture.video.addEventListener("ended", () => pauseSharing(capture))

    // A screen or tab capture can carry the system audio directly. A window
    // capture never can, so another source has to fill in.
    if (capture.audio) {
      attachGameAudio({ stream: capture.stream, track: capture.audio, keepAlive: null, source: "screen", label: capture.label })
      return
    }
    if (!wantGameAudio || gameAudioRef.current) return

    const loopback = audioInputs.find(isLoopbackDevice)
    if (loopback) {
      await connectGameAudio(loopback.deviceId).catch(() => {})
      return
    }

    setGameAudioState("off")
    toast.warning(
      capture.surface === "window" ? "O Chrome não envia o som de uma janela" : "Essa tela veio sem áudio",
      { description: "Use o botão Áudio do jogo para escolher a fonte do som sem precisar parar a live." },
    )
  }, [attachGameAudio, audioInputs, connectGameAudio, pauseSharing, showPreview])

  /** First capture of the live. The mixer is created before the picker opens
   * because an AudioContext born outside a user gesture starts suspended, and a
   * suspended graph silently outputs nothing. */
  const beginCapture = useCallback(async (profile: VideoProfile, withMic: boolean, withGameAudio: boolean) => {
    const mixer = ensureMixer()
    const capture = await captureDisplay(profile, withGameAudio)
    try {
      if (withMic) await enableMic()
      else mixer.setMuted("mic", true)
      await adoptDisplay(capture, withGameAudio)
      videoTrackRef.current = capture.video
      return capture
    } catch (caught: unknown) {
      stopCapture(capture)
      displayRef.current = null
      videoTrackRef.current = null
      setSharing(false)
      throw caught
    }
  }, [adoptDisplay, enableMic, ensureMixer])

  /** Swapping the source keeps the transport untouched, so viewers see the new
   * screen on the next frame instead of reconnecting. */
  const switchCapture = useCallback(async (profile: VideoProfile) => {
    const wantGameAudio = !gameAudioRef.current
    const capture = await captureDisplay(profile, wantGameAudio)
    const previous = displayRef.current

    await adoptDisplay(capture, wantGameAudio)
    videoTrackRef.current = capture.video

    if (previous && previous !== capture) {
      if (gameAudioRef.current?.stream === previous.stream) {
        // The old capture is still the sound source. Chrome ends the audio if
        // its video track stops, so it is throttled to a still frame instead.
        await previous.video.applyConstraints({ frameRate: { ideal: 1, max: 1 } }).catch(() => {})
      } else {
        stopCapture(previous)
      }
    }
    return capture
  }, [adoptDisplay])

  const stopMedia = useCallback(() => {
    releaseGameAudio()
    stopCapture(displayRef.current)
    micRef.current?.getTracks().forEach((track) => track.stop())
    mixerRef.current?.close()
    displayRef.current = null
    micRef.current = null
    mixerRef.current = null
    videoTrackRef.current = null
    showPreview(null)
    setSharing(false)
    setMicReady(false)
    setMicOn(false)
    setGameAudioState("off")
    setGameAudioLabel("")
    setScreen(null)
  }, [releaseGameAudio, showPreview])

  // ─── MONITORING ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!monitor) return
    const interval = window.setInterval(() => {
      const mixer = mixerRef.current
      if (!mixer) return

      const next = mixer.readLevels()
      setLevels((current) => (Math.abs(current.game - next.game) < 0.02 && Math.abs(current.mic - next.mic) < 0.02 ? current : next))

      if (!mixer.hasSource("game")) return
      if (next.game > 0.008) loudAtRef.current = Date.now()
      setGameAudioState(Date.now() - loudAtRef.current > SILENCE_GRACE_MS ? "silent" : "live")
    }, 200)
    return () => window.clearInterval(interval)
  }, [monitor])

  useEffect(() => {
    const refresh = () => { void listAudioInputs().then(setAudioInputs).catch(() => {}) }
    refresh()
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh)
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refresh)
  }, [])

  const loopbackDevices = useMemo(() => audioInputs.filter(isLoopbackDevice), [audioInputs])

  return {
    previewRef,
    mixerRef,
    videoTrackRef,
    sharing,
    screen,
    micReady,
    micOn,
    micBusy,
    gameAudioState,
    gameAudioLabel,
    gameAudioBusy,
    levels,
    audioInputs,
    loopbackDevices,
    ensureMixer,
    beginCapture,
    switchCapture,
    toggleMic,
    connectGameAudio,
    disconnectGameAudio,
    setVolume,
    stopMedia,
  }
}
