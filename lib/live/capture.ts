/**
 * Screen and audio capture helpers.
 *
 * The important fact this file is built around: Chrome never attaches audio to
 * a captured *window*. Only a whole screen or a browser tab can carry sound.
 * Sharing the League window therefore always produces a silent live, and the
 * only fixes are a Windows loopback input or a second capture of the whole
 * screen that we keep for its audio alone. Both are implemented here.
 */

import { displayVideoConstraints, contentHintFor, type VideoProfile } from "./tuning"

export type DisplaySurface = "monitor" | "window" | "browser" | "unknown"

type ExtendedDisplayMediaOptions = DisplayMediaStreamOptions & {
  selfBrowserSurface?: "include" | "exclude"
  surfaceSwitching?: "include" | "exclude"
  systemAudio?: "include" | "exclude"
  monitorTypeSurfaces?: "include" | "exclude"
}

export interface DisplayCapture {
  stream: MediaStream
  video: MediaStreamTrack
  audio: MediaStreamTrack | null
  surface: DisplaySurface
  label: string
}

export interface AudioCapture {
  stream: MediaStream
  track: MediaStreamTrack
  /** Display captures die when their video track stops, so it is kept alive. */
  keepAlive: MediaStreamTrack | null
  source: "screen" | "device"
  label: string
}

const HIGH_FIDELITY_AUDIO: MediaTrackConstraints = {
  autoGainControl: false,
  echoCancellation: false,
  noiseSuppression: false,
  channelCount: 2,
  sampleRate: 48_000,
}

export function surfaceOf(track: MediaStreamTrack): DisplaySurface {
  const surface = (track.getSettings() as MediaTrackSettings & { displaySurface?: string }).displaySurface
  if (surface === "monitor" || surface === "window" || surface === "browser") return surface
  return "unknown"
}

export function readableSurfaceLabel(track: MediaStreamTrack) {
  const label = track.label?.trim()
  if (!label || label.includes("://")) {
    const surface = surfaceOf(track)
    if (surface === "monitor") return "Tela inteira"
    if (surface === "window") return "Janela"
    if (surface === "browser") return "Aba do navegador"
    return "Tela compartilhada"
  }
  return label
}

export async function captureDisplay(profile: VideoProfile, withAudio: boolean): Promise<DisplayCapture> {
  const options: ExtendedDisplayMediaOptions = {
    video: displayVideoConstraints(profile),
    audio: withAudio ? HIGH_FIDELITY_AUDIO : false,
    systemAudio: withAudio ? "include" : "exclude",
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
    monitorTypeSurfaces: "include",
  }

  const stream = await navigator.mediaDevices.getDisplayMedia(options)
  const video = stream.getVideoTracks()[0]
  if (!video) {
    stream.getTracks().forEach((track) => track.stop())
    throw new Error("A tela selecionada não retornou imagem.")
  }

  video.contentHint = contentHintFor(profile)
  await video.applyConstraints(displayVideoConstraints(profile)).catch(() => {})

  return {
    stream,
    video,
    audio: stream.getAudioTracks()[0] ?? null,
    surface: surfaceOf(video),
    label: readableSurfaceLabel(video),
  }
}

/**
 * Second capture used only as an audio source. The picker is opened again so
 * the host can tick "share system audio" on a whole screen; the video that
 * comes with it is throttled to a still frame and never leaves the machine.
 */
export async function captureScreenAudio(): Promise<AudioCapture> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 1, max: 1 } },
    audio: HIGH_FIDELITY_AUDIO,
    systemAudio: "include",
    selfBrowserSurface: "exclude",
    monitorTypeSurfaces: "include",
  } as ExtendedDisplayMediaOptions)

  const track = stream.getAudioTracks()[0]
  const keepAlive = stream.getVideoTracks()[0] ?? null
  if (!track) {
    stream.getTracks().forEach((item) => item.stop())
    throw new Error("no-system-audio")
  }

  await keepAlive?.applyConstraints({ frameRate: { ideal: 1, max: 1 }, width: { max: 160 } }).catch(() => {})
  return { stream, track, keepAlive, source: "screen", label: "Áudio da tela inteira" }
}

const LOOPBACK_PATTERN = /stereo mix|mixagem est[eé]reo|what u hear|wave out|cable output|vb-audio|voicemeeter|loopback|som do sistema/i

export function isLoopbackDevice(device: MediaDeviceInfo) {
  return device.kind === "audioinput" && LOOPBACK_PATTERN.test(device.label)
}

/**
 * Device labels stay empty until the page has been granted microphone access
 * once, so a throwaway capture is used to reveal them.
 */
export async function listAudioInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  let devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[])
  if (!devices.some((device) => device.kind === "audioinput" && device.label)) {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
    probe?.getTracks().forEach((track) => track.stop())
    devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[])
  }
  return devices.filter((device) => device.kind === "audioinput")
}

export async function captureDeviceAudio(deviceId: string, label: string): Promise<AudioCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId }, ...HIGH_FIDELITY_AUDIO },
  })
  const track = stream.getAudioTracks()[0]
  if (!track) {
    stream.getTracks().forEach((item) => item.stop())
    throw new Error("no-device-audio")
  }
  return { stream, track, keepAlive: null, source: "device", label: label || track.label }
}

export async function captureMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
}

export function stopCapture(capture: { stream: MediaStream } | null | undefined) {
  capture?.stream.getTracks().forEach((track) => track.stop())
}
