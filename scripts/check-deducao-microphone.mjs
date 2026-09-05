import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"

const filename = "app/(game)/games/deducao/[roomId]/use-proximity-voice.ts"
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function events() {
  const handlers = new Map()
  return {
    addEventListener(name, handler) { (handlers.get(name) ?? handlers.set(name, new Set()).get(name)).add(handler) },
    removeEventListener(name, handler) { handlers.get(name)?.delete(handler) },
    dispatch(name) { for (const handler of handlers.get(name) ?? []) handler() },
    count() { return [...handlers.values()].reduce((sum, values) => sum + values.size, 0) },
  }
}

function microphone(id = "usb") {
  const track = { kind: "audio", readyState: "live", enabled: true, onended: null, stops: 0,
    stop() { this.readyState = "ended"; this.stops++ },
    end() { this.readyState = "ended"; this.onended?.() },
    getSettings() { return { deviceId: id } },
  }
  return { track, getAudioTracks: () => [track], getTracks: () => [track] }
}

function harness({ request = async () => microphone(), rtc = true, media = true } = {}) {
  const slots = [], effects = [], pending = [], intervals = new Map(), sent = [], requests = [], messages = new Map()
  const permission = { ...events(), state: "granted" }
  const mediaDevices = { ...events(), async getUserMedia(constraints) { requests.push(constraints); return request() },
    async enumerateDevices() { return [
      { kind: "audioinput", deviceId: "usb", label: "USB" },
      { kind: "audioinput", deviceId: "headset", label: "Headset" },
      { kind: "audiooutput", deviceId: "speaker", label: "Speaker" },
    ] },
  }
  let index = 0, dirty = false, mounted = true, value, serial = 0
  const react = {
    useState(initial) {
      const key = index++
      if (!(key in slots)) slots[key] = typeof initial === "function" ? initial() : initial
      return [slots[key], (next) => {
        const updated = typeof next === "function" ? next(slots[key]) : next
        if (!Object.is(slots[key], updated)) { slots[key] = updated; dirty = true }
      }]
    },
    useRef(initial) { const key = index++; return slots[key] ??= { current: initial } },
    useCallback(callback, dependencies) {
      const key = index++, previous = slots[key]
      if (!previous || dependencies.some((entry, i) => !Object.is(entry, previous.dependencies[i]))) {
        slots[key] = { callback, dependencies }
      }
      return slots[key].callback
    },
    useEffect(callback, dependencies) {
      const key = index++, previous = effects[key]
      if (!previous || dependencies.some((entry, i) => !Object.is(entry, previous.dependencies[i]))) {
        pending.push(() => { previous?.cleanup?.(); effects[key] = { dependencies, cleanup: callback() } })
      }
    },
  }
  const connections = []
  class Peer {
    signalingState = "stable"
    localDescription = null
    remoteDescription = null
    senders = []
    constructor() { connections.push(this) }
    addTrack(track) { this.senders.push({ track, async replaceTrack(next) { this.track = next } }) }
    getSenders() { return this.senders }
    close() { this.closed = true }
    async createOffer() { return { type: "offer", sdp: "test" } }
    async setLocalDescription(description) { this.localDescription = description }
    async setRemoteDescription(description) { this.remoteDescription = description }
    async addIceCandidate() {}
  }
  const players = new Map([ ["me", { id: "me", alive: true, connected: true }], ["zz", { id: "zz", alive: true, connected: true }] ])
  const roomRef = { current: { state: { players }, send(type, payload) { sent.push({ type, payload }) },
    onMessage(type, callback) { messages.set(type, callback); return () => messages.delete(type) },
  } }
  const snapshot = { phase: "lobby", players: [...players.values()] }
  const options = { roomRef, snapshot, me: "me", poseRef: { current: { x: 0, z: 0, dir: 0 } } }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require(name) {
    if (name === "react") return react
    throw new Error(`Unexpected dependency: ${name}`)
  }, DOMException, Error, navigator: {
    mediaDevices: media ? mediaDevices : undefined,
    permissions: { query: async () => permission },
  }, RTCPeerConnection: rtc ? Peer : undefined,
  document: { body: { appendChild() {} }, createElement() { return {
    dataset: {}, style: {}, setAttribute() {}, pause() {}, remove() {}, play: async () => {},
  } } }, window: {
    setInterval(callback, ms) { intervals.set(++serial, { callback, ms }); return serial },
    clearInterval(key) { intervals.delete(key) },
  } }, { filename })
  function render() {
    let passes = 0
    do {
      assert.ok(++passes < 20, "Hook must settle without a render loop")
      dirty = false; index = 0
      value = module.exports.useProximityVoice(options)
      for (const effect of pending.splice(0)) effect()
    } while (dirty && mounted)
  }
  render()
  return { get value() { return value }, sent, requests, permission, mediaDevices, connections, intervals, messages,
    render, async settle() { for (let i = 0; i < 8; i++) { await Promise.resolve(); if (mounted && dirty) render() } },
    heartbeat() { for (const timer of intervals.values()) if (timer.ms === 10000) timer.callback() },
    unmount() { mounted = false; for (const effect of effects) effect?.cleanup?.() },
    phase(phase) { options.snapshot = { ...options.snapshot, phase }; render() },
  }
}

let checks = 0
async function check(name, run) { await run(); checks++; console.log(`PASS ${name}`) }
const statuses = (h) => h.sent.filter((message) => message.type === "microphone:status").map((message) => message.payload.ready)

await check("Never requests or records microphone before an explicit click", async () => {
  const h = harness(); await h.settle()
  assert.equal(h.requests.length, 0); assert.equal(h.value.configured, false); assert.deepEqual(statuses(h), [])
  h.unmount()
})
await check("Permission plus live audio configures one microphone, lists only inputs and acknowledges readiness", async () => {
  const h = harness(); h.value.configure(); h.value.configure(); await h.settle()
  assert.equal(h.requests.length, 1); assert.equal(h.value.configured, true); assert.equal(h.value.busy, false)
  assert.equal(h.requests[0].video, false); assert.equal(h.value.selectedDeviceId, "usb")
  assert.deepEqual(Array.from(h.value.devices, (device) => device.label), ["USB", "Headset"])
  assert.deepEqual(statuses(h), [true]); h.unmount()
})
await check("Mute preserves permission, live capture and reception instead of leaving voice", async () => {
  const stream = microphone(), h = harness({ request: async () => stream })
  h.value.configure(); await h.settle(); h.value.toggle(); h.render()
  assert.equal(stream.track.enabled, false); assert.equal(h.value.enabled, false); assert.equal(h.value.configured, true)
  assert.equal(stream.track.stops, 0); assert.ok(h.intervals.size > 0)
  assert.equal(h.sent.filter((message) => message.type === "voice:leave").length, 0)
  h.value.toggle(); h.render(); assert.equal(stream.track.enabled, true); h.unmount()
})
await check("Lobby, game and meeting keep the same microphone without another prompt", async () => {
  const stream = microphone(), h = harness({ request: async () => stream })
  h.value.configure(); await h.settle()
  for (const phase of ["jogando", "reuniao", "votacao", "jogando", "fim", "lobby"]) h.phase(phase)
  assert.equal(h.requests.length, 1); assert.equal(stream.track.stops, 0); assert.equal(h.value.configured, true)
  h.unmount(); assert.equal(stream.track.stops, 1); assert.equal(h.intervals.size, 0)
})
await check("Denied, missing or busy devices stay unconfigured with actionable errors", async () => {
  for (const name of ["NotAllowedError", "NotFoundError", "NotReadableError", "OverconstrainedError"]) {
    const h = harness({ request: async () => { throw new DOMException("raw device error", name) } })
    h.value.configure(); await h.settle()
    assert.equal(h.value.configured, false); assert.equal(h.value.busy, false)
    assert.ok(h.value.error.length > 25); assert.ok(!h.value.error.includes("raw device error"))
    assert.ok(!statuses(h).includes(true)); h.unmount()
  }
})
await check("Unsupported browser and stream without audio never acknowledge readiness", async () => {
  for (const options of [{ rtc: false }, { media: false }, { request: async () => ({ getTracks: () => [], getAudioTracks: () => [] }) }]) {
    const h = harness(options); h.value.configure(); await h.settle()
    assert.equal(h.value.configured, false); assert.equal(h.value.busy, false); assert.ok(h.value.error)
    assert.ok(!statuses(h).includes(true)); h.unmount()
  }
})
await check("Permission revocation and track ending withdraw readiness immediately", async () => {
  for (const revoke of [true, false]) {
    const stream = microphone(), h = harness({ request: async () => stream })
    h.value.configure(); await h.settle()
    if (revoke) { h.permission.state = "denied"; h.permission.dispatch("change") } else stream.track.end()
    h.render(); assert.equal(h.value.configured, false); assert.equal(statuses(h).at(-1), false)
    assert.ok(h.value.error); h.unmount(); assert.equal(h.permission.count(), 0); assert.equal(h.mediaDevices.count(), 0)
  }
})
await check("A pending permission result after leaving is stopped and never joins voice", async () => {
  let resolve
  const stream = microphone(), h = harness({ request: () => new Promise((done) => { resolve = done }) })
  h.value.configure(); h.unmount(); resolve(stream); await h.settle()
  assert.equal(stream.track.stops, 1); assert.ok(!statuses(h).includes(true))
  assert.equal(h.sent.filter((message) => message.type === "voice:join").length, 0)
})
await check("Changing device replaces peer audio, stops the old stream and preserves mute", async () => {
  const first = microphone(), second = microphone("headset")
  let calls = 0
  const h = harness({ request: async () => calls++ === 0 ? first : second })
  h.value.configure(); await h.settle(); h.messages.get("voice:peers")({ peers: ["zz"] }); await h.settle()
  h.value.toggle(); h.render(); h.value.configure("headset"); await h.settle()
  assert.equal(h.requests[1].audio.deviceId.exact, "headset"); assert.equal(first.track.stops, 1)
  assert.equal(second.track.enabled, false); assert.equal(h.value.selectedDeviceId, "headset")
  assert.equal(h.connections[0].getSenders()[0].track, second.track); assert.equal(h.connections[0].closed, undefined)
  h.unmount(); assert.equal(second.track.stops, 1)
})
await check("Failed device change keeps the previous working microphone", async () => {
  const stream = microphone(); let calls = 0
  const h = harness({ request: async () => { if (calls++ === 0) return stream; throw new DOMException("", "NotFoundError") } })
  h.value.configure(); await h.settle(); h.value.configure("missing"); await h.settle()
  assert.equal(h.value.configured, true); assert.equal(h.value.busy, false); assert.ok(h.value.error)
  assert.equal(stream.track.stops, 0); assert.equal(h.value.selectedDeviceId, "usb"); h.unmount()
})
await check("Heartbeat reconfirms only a live microphone and detects silently ended capture", async () => {
  const stream = microphone(), h = harness({ request: async () => stream })
  h.value.configure(); await h.settle(); h.heartbeat(); assert.equal(statuses(h).at(-1), true)
  stream.track.readyState = "ended"; h.heartbeat(); h.render()
  assert.equal(h.value.configured, false); assert.equal(statuses(h).at(-1), false); h.unmount()
})

console.log(`Dedução microphone: ${checks}/${checks} checks passed. Browser media and transport are mocked; no physical microphone was accessed.`)
