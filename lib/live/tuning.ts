/**
 * Ajustes de codificação da transmissão.
 *
 * Tudo aqui existe para dois objetivos: imagem que continua nítida e fluida com
 * um jogo rodando ao lado, e o menor atraso possível entre a tela de quem
 * transmite e a de quem assiste.
 */

export type VideoQuality = "720p" | "1080p" | "source"
export type VideoFrameRate = 30 | 60

export interface VideoProfile {
  quality: VideoQuality
  frameRate: VideoFrameRate
}

export const AUDIO_BITRATE_BPS = 160_000

export function displayVideoConstraints({ quality, frameRate }: VideoProfile): MediaTrackConstraints {
  const fps = { ideal: frameRate, max: frameRate }
  if (quality === "720p") return { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: fps }
  if (quality === "1080p") return { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: fps }
  return { frameRate: fps }
}

function targetVideoBitrate({ quality, frameRate }: VideoProfile) {
  const base = quality === "720p" ? 2_800_000 : quality === "1080p" ? 6_000_000 : 9_000_000
  return frameRate === 60 ? Math.round(base * 1.6) : base
}

/**
 * 60 FPS é escolhido por causa de movimento, então o codificador protege a taxa
 * de quadros. 30 FPS é escolhido por causa de leitura, então ele protege os
 * pixels, mas fica em "balanced" porque proteger resolução a todo custo
 * transforma internet fraca em slideshow.
 */
export function contentHintFor(profile: VideoProfile): "motion" | "detail" {
  return profile.frameRate === 60 ? "motion" : "detail"
}

function degradationFor(profile: VideoProfile): RTCDegradationPreference {
  return profile.frameRate === 60 ? "maintain-framerate" : "balanced"
}

export interface SfuVideoOptions {
  videoCodec: "vp9" | "h264"
  simulcast: boolean
  backupCodec: boolean
  screenShareEncoding: { maxBitrate: number; maxFramerate: number }
  degradationPreference: RTCDegradationPreference
}

/**
 * O host envia uma cópia só, não importa quantas pessoas estejam assistindo,
 * então o bitrate é o alvo cheio do perfil.
 *
 * Em 30 FPS a imagem é publicada em VP9. Em 60 FPS ela usa H.264 para aproveitar
 * a codificação por hardware do Windows, mas sem simulcast: codificar várias
 * camadas ao mesmo tempo derruba o FPS no Edge durante uma captura 1080p.
 */
export function sfuVideoOptions(profile: VideoProfile): SfuVideoOptions {
  const svc = profile.frameRate !== 60
  return {
    videoCodec: svc ? "vp9" : "h264",
    simulcast: false,
    backupCodec: svc,
    screenShareEncoding: {
      maxBitrate: targetVideoBitrate(profile),
      maxFramerate: profile.frameRate,
    },
    degradationPreference: degradationFor(profile),
  }
}
