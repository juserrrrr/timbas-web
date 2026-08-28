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
 * 60 FPS é escolhido por causa de movimento, 30 FPS por causa de leitura. O
 * hint muda o que o codificador prioriza dentro do bitrate disponível.
 */
export function contentHintFor(profile: VideoProfile): "motion" | "detail" {
  return profile.frameRate === 60 ? "motion" : "detail"
}

/**
 * Quem escolhe 30 FPS está mostrando tela para ler, e aí a resolução vem antes
 * de tudo: com "maintain-framerate" o codificador segurava os quadros e ia
 * cortando pixels, e era assim que uma live começava em 1080p e terminava em
 * 180p, sem dar para ler nada.
 *
 * Em 60 FPS o assunto é o oposto. Segurar 1080p num aperto de banda ou de CPU
 * não guarda a imagem, guarda só o número: o codificador continua com a mesma
 * grade de pixels e vai tirando bit de cada quadro, e cena de jogo, onde quase
 * tudo muda de um quadro para o outro, vira borrão. "balanced" deixa ele
 * escolher, então a live cai para uma resolução menor e limpa e volta a crescer
 * quando a banda sobra.
 */
function degradationFor(profile: VideoProfile): RTCDegradationPreference {
  return profile.frameRate === 60 ? "balanced" : "maintain-resolution"
}

/// O alvo de resolução só é reimposto no perfil que promete resolução. No de
/// movimento, encolher é a saída certa e forçar o alvo de volta seria desfazer
/// a decisão do codificador a cada 20 segundos.
export function pinsResolution(profile: VideoProfile): boolean {
  return degradationFor(profile) === "maintain-resolution"
}

/// Altura que o perfil promete entregar. Serve para o vigia saber que o
/// codificador encolheu a imagem e que dá para tentar voltar.
export function expectedHeightFor(profile: VideoProfile, captureHeight: number): number {
  if (profile.quality === "720p") return Math.min(720, captureHeight || 720)
  if (profile.quality === "1080p") return Math.min(1080, captureHeight || 1080)
  return captureHeight || 1080
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
