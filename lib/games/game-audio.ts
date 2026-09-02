export type GameSound = "step" | "action" | "task" | "kill" | "vent" | "blackout" | "meeting"

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (context) return context
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  context = new AudioContextClass()
  return context
}

export function unlockGameAudio() {
  const current = audioContext()
  if (current?.state === "suspended") void current.resume()
}

function tone(
  current: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  delay = 0,
  endFrequency = frequency,
) {
  const starts = current.currentTime + delay
  const oscillator = current.createOscillator()
  const gain = current.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, starts)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), starts + duration)
  gain.gain.setValueAtTime(0.0001, starts)
  gain.gain.exponentialRampToValueAtTime(volume, starts + Math.min(0.018, duration / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, starts + duration)
  oscillator.connect(gain).connect(current.destination)
  oscillator.start(starts)
  oscillator.stop(starts + duration + 0.02)
}

function noise(current: AudioContext, duration: number, volume: number, delay = 0) {
  const length = Math.max(1, Math.floor(current.sampleRate * duration))
  const buffer = current.createBuffer(1, length, current.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1

  const source = current.createBufferSource()
  const filter = current.createBiquadFilter()
  const gain = current.createGain()
  const starts = current.currentTime + delay
  source.buffer = buffer
  filter.type = "lowpass"
  filter.frequency.value = 650
  gain.gain.setValueAtTime(volume, starts)
  gain.gain.exponentialRampToValueAtTime(0.0001, starts + duration)
  source.connect(filter).connect(gain).connect(current.destination)
  source.start(starts)
}

export function playGameSound(sound: GameSound) {
  const current = audioContext()
  if (!current) return
  if (current.state === "suspended") void current.resume()

  if (sound === "step") {
    tone(current, 105 + Math.random() * 18, 0.055, 0.018, "triangle", 0, 72)
  } else if (sound === "action") {
    tone(current, 420, 0.07, 0.035, "square", 0, 620)
  } else if (sound === "task") {
    tone(current, 440, 0.12, 0.045, "sine")
    tone(current, 660, 0.16, 0.04, "sine", 0.1)
    tone(current, 880, 0.2, 0.035, "sine", 0.22)
  } else if (sound === "kill") {
    noise(current, 0.24, 0.08)
    tone(current, 150, 0.34, 0.07, "sawtooth", 0, 42)
  } else if (sound === "vent") {
    noise(current, 0.18, 0.045)
    tone(current, 240, 0.2, 0.035, "triangle", 0, 90)
  } else if (sound === "blackout") {
    tone(current, 520, 0.16, 0.045, "square")
    tone(current, 390, 0.2, 0.045, "square", 0.2)
    tone(current, 260, 0.28, 0.05, "square", 0.44)
  } else if (sound === "meeting") {
    tone(current, 330, 0.18, 0.055, "sawtooth")
    tone(current, 440, 0.18, 0.05, "sawtooth", 0.18)
    tone(current, 660, 0.28, 0.045, "sawtooth", 0.36)
  }
}
