/**
 * Encoder, codec and jitter-buffer tuning for the live broadcast.
 *
 * Everything here exists for two goals: a picture that stays sharp and fluid
 * while a game is running, and the shortest possible delay between the host's
 * screen and the viewer's screen.
 */

export type VideoQuality = "720p" | "1080p" | "source"
export type VideoFrameRate = 30 | 60

export interface VideoProfile {
  quality: VideoQuality
  frameRate: VideoFrameRate
}

/**
 * P2P means the host uploads one copy of the stream per viewer. This is the
 * total we are willing to ask from the host's upload before we start shrinking
 * each copy, so a full room degrades gracefully instead of freezing everyone.
 */
const UPLINK_BUDGET_BPS = 14_000_000
const MIN_VIDEO_BPS = 800_000

export const AUDIO_BITRATE_BPS = 160_000

export function displayVideoConstraints({ quality, frameRate }: VideoProfile): MediaTrackConstraints {
  const fps = { ideal: frameRate, max: frameRate }
  if (quality === "720p") return { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: fps }
  if (quality === "1080p") return { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: fps }
  return { frameRate: fps }
}

export function targetVideoBitrate({ quality, frameRate }: VideoProfile) {
  const base = quality === "720p" ? 2_800_000 : quality === "1080p" ? 6_000_000 : 9_000_000
  return frameRate === 60 ? Math.round(base * 1.6) : base
}

export function videoBitrateForViewers(profile: VideoProfile, viewers: number) {
  const perViewer = targetVideoBitrate(profile)
  if (viewers <= 1) return perViewer
  return Math.max(MIN_VIDEO_BPS, Math.min(perViewer, Math.round(UPLINK_BUDGET_BPS / viewers)))
}

/**
 * 60 FPS is chosen for movement, so the encoder should protect the frame rate.
 * 30 FPS is chosen for readability, so it protects pixels instead, but stays on
 * "balanced" because pure maintain-resolution turns a weak upload into a
 * slideshow.
 */
export function contentHintFor(profile: VideoProfile): "motion" | "detail" {
  return profile.frameRate === 60 ? "motion" : "detail"
}

function degradationFor(profile: VideoProfile): RTCDegradationPreference {
  return profile.frameRate === 60 ? "maintain-framerate" : "balanced"
}

/**
 * At 60 FPS we put H.264 first: it is the one codec Windows GPUs encode in
 * hardware for WebRTC, so the game keeps its CPU. At 30 FPS VP9 fits, and it
 * keeps small HUD text readable at a much lower bitrate than H.264.
 */
export function preferVideoCodecs(transceiver: RTCRtpTransceiver, profile: VideoProfile) {
  const capabilities = RTCRtpSender.getCapabilities?.("video")
  if (!capabilities?.codecs?.length || !transceiver.setCodecPreferences) return

  const wanted = profile.frameRate === 60
    ? ["video/h264", "video/vp9", "video/vp8"]
    : ["video/vp9", "video/h264", "video/vp8"]

  const rank = (codec: RTCRtpCodec) => {
    const index = wanted.indexOf(codec.mimeType.toLowerCase())
    return index === -1 ? wanted.length : index
  }

  try {
    transceiver.setCodecPreferences([...capabilities.codecs].sort((a, b) => rank(a) - rank(b)))
  } catch {}
}

export async function tuneVideoSender(sender: RTCRtpSender, profile: VideoProfile, viewers: number) {
  const parameters = sender.getParameters()
  parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}]
  parameters.encodings[0] = {
    ...parameters.encodings[0],
    active: true,
    maxBitrate: videoBitrateForViewers(profile, viewers),
    maxFramerate: profile.frameRate,
    scaleResolutionDownBy: 1,
    networkPriority: "high",
    priority: "high",
  }
  parameters.degradationPreference = degradationFor(profile)
  await sender.setParameters(parameters).catch(() => {})
}

export async function tuneAudioSender(sender: RTCRtpSender) {
  const parameters = sender.getParameters()
  parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}]
  parameters.encodings[0] = {
    ...parameters.encodings[0],
    active: true,
    maxBitrate: AUDIO_BITRATE_BPS,
    networkPriority: "high",
    priority: "high",
  }
  await sender.setParameters(parameters).catch(() => {})
}

function mergeFmtp(existing: string, extra: Record<string, string>) {
  const params = new Map<string, string>()
  for (const entry of existing.split(";")) {
    const [key, ...rest] = entry.trim().split("=")
    if (key) params.set(key, rest.join("="))
  }
  for (const [key, value] of Object.entries(extra)) params.set(key, value)
  return [...params].map(([key, value]) => (value ? `${key}=${value}` : key)).join(";")
}

/**
 * Chrome negotiates Opus in mono at ~32 kbit/s by default, which is why game
 * audio sounds like a phone call. There is no API for this, so the fmtp line is
 * rewritten before the description is applied. DTX is disabled as well: it
 * gates quiet passages and makes music stutter.
 */
export function tuneOpusSdp(sdp: string | undefined) {
  if (!sdp) return sdp
  const rtpmap = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i)
  if (!rtpmap) return sdp

  const payload = rtpmap[1]
  const extra = {
    stereo: "1",
    "sprop-stereo": "1",
    maxaveragebitrate: String(AUDIO_BITRATE_BPS),
    maxplaybackrate: "48000",
    useinbandfec: "1",
    usedtx: "0",
  }

  const fmtp = new RegExp(`a=fmtp:${payload} (.*)`)
  if (fmtp.test(sdp)) return sdp.replace(fmtp, (_match, existing: string) => `a=fmtp:${payload} ${mergeFmtp(existing, extra)}`)
  return sdp.replace(rtpmap[0], `${rtpmap[0]}\r\na=fmtp:${payload} ${mergeFmtp("", extra)}`)
}

type TunableReceiver = RTCRtpReceiver & { playoutDelayHint?: number; jitterBufferTarget?: number }

/**
 * The default jitter buffer holds several hundred milliseconds. For a live the
 * viewer is watching next to the host, delay hurts more than an occasional
 * dropped frame, so video plays as soon as it lands and audio keeps only a
 * small cushion to avoid crackling.
 */
export function tuneReceiverLatency(pc: RTCPeerConnection) {
  for (const receiver of pc.getReceivers() as TunableReceiver[]) {
    const isVideo = receiver.track?.kind === "video"
    try { receiver.playoutDelayHint = isVideo ? 0 : 0.06 } catch {}
    try { receiver.jitterBufferTarget = isVideo ? 0 : 60 } catch {}
  }
}

// ─── SFU ────────────────────────────────────────────────────────────────────

export interface SfuVideoOptions {
  videoCodec: "vp9" | "h264"
  simulcast: boolean
  backupCodec: boolean
  videoEncoding: { maxBitrate: number; maxFramerate: number }
  degradationPreference: RTCDegradationPreference
}

/**
 * Through the SFU the host sends a single copy no matter how many people are
 * watching, so the bitrate is the full profile target instead of a divided
 * share.
 *
 * At 30 FPS the picture is published as VP9, whose built in SVC layers let the
 * server hand a smaller version to whoever has a weak connection without the
 * host encoding anything extra. At 60 FPS that costs too much CPU next to a
 * running game, so it falls back to H.264 with plain simulcast, which Windows
 * GPUs encode in hardware.
 */
export function sfuVideoOptions(profile: VideoProfile): SfuVideoOptions {
  const svc = profile.frameRate !== 60
  return {
    videoCodec: svc ? "vp9" : "h264",
    simulcast: !svc,
    backupCodec: svc,
    videoEncoding: {
      maxBitrate: targetVideoBitrate(profile),
      maxFramerate: profile.frameRate,
    },
    degradationPreference: degradationFor(profile),
  }
}
