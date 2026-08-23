/**
 * Mixes every audio source of the broadcast into a single outgoing track.
 *
 * The track is created once and never replaced. Turning the microphone on,
 * plugging the game audio in halfway through the live or swapping the capture
 * device only rewires nodes inside the graph, so the peer connections never
 * have to renegotiate and viewers never see the picture drop.
 */

export type AudioSourceKind = "game" | "mic"

export interface AudioMixerLevels {
  game: number
  mic: number
}

interface Channel {
  gain: GainNode
  analyser: AnalyserNode
  samples: Float32Array<ArrayBuffer>
  source: MediaStreamAudioSourceNode | null
  volume: number
  muted: boolean
}

export interface LiveAudioMixer {
  readonly track: MediaStreamTrack
  setSource(kind: AudioSourceKind, stream: MediaStream | null): void
  hasSource(kind: AudioSourceKind): boolean
  setVolume(kind: AudioSourceKind, volume: number): void
  setMuted(kind: AudioSourceKind, muted: boolean): void
  isMuted(kind: AudioSourceKind): boolean
  resume(): void
  readLevels(): AudioMixerLevels
  close(): void
}

export function createAudioMixer(): LiveAudioMixer {
  const context = new AudioContext({ sampleRate: 48_000, latencyHint: "interactive" })
  const destination = context.createMediaStreamDestination()
  destination.channelCount = 2
  destination.channelCountMode = "explicit"
  destination.channelInterpretation = "speakers"

  const track = destination.stream.getAudioTracks()[0]
  // Tells the encoder this is full-range content instead of speech, which keeps
  // Opus from applying voice-oriented processing to game and music audio.
  track.contentHint = "music"

  const channels: Record<AudioSourceKind, Channel> = {
    game: createChannel(context, destination),
    mic: createChannel(context, destination),
  }

  void context.resume().catch(() => {})

  const apply = (channel: Channel) => {
    channel.gain.gain.setTargetAtTime(channel.muted ? 0 : channel.volume, context.currentTime, 0.02)
  }

  return {
    track,

    setSource(kind, stream) {
      const channel = channels[kind]
      channel.source?.disconnect()
      channel.source = null

      const audioTrack = stream?.getAudioTracks().find((item) => item.readyState === "live")
      if (!audioTrack) return

      const source = context.createMediaStreamSource(new MediaStream([audioTrack]))
      source.connect(channel.gain)
      // Metering happens before the gain so a muted source still shows that
      // sound is arriving, which is what tells a host the capture is alive.
      source.connect(channel.analyser)
      channel.source = source
      void context.resume().catch(() => {})
    },

    hasSource(kind) {
      return channels[kind].source !== null
    },

    setVolume(kind, volume) {
      const channel = channels[kind]
      channel.volume = Math.max(0, Math.min(2, volume))
      apply(channel)
    },

    setMuted(kind, muted) {
      const channel = channels[kind]
      channel.muted = muted
      apply(channel)
    },

    isMuted(kind) {
      return channels[kind].muted
    },

    resume() {
      if (context.state !== "running") void context.resume().catch(() => {})
    },

    readLevels() {
      return { game: peakOf(channels.game), mic: peakOf(channels.mic) }
    },

    close() {
      for (const channel of Object.values(channels)) channel.source?.disconnect()
      track.stop()
      void context.close().catch(() => {})
    },
  }
}

function createChannel(context: AudioContext, destination: MediaStreamAudioDestinationNode): Channel {
  const gain = context.createGain()
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  gain.gain.value = 1
  gain.connect(destination)
  return { gain, analyser, samples: new Float32Array(new ArrayBuffer(analyser.fftSize * 4)), source: null, volume: 1, muted: false }
}

function peakOf(channel: Channel) {
  if (!channel.source) return 0
  channel.analyser.getFloatTimeDomainData(channel.samples)
  let peak = 0
  for (const sample of channel.samples) {
    const value = Math.abs(sample)
    if (value > peak) peak = value
  }
  return Math.min(1, peak)
}
