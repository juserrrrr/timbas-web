import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const filename = "lib/games/game-audio.ts"
const source = await readFile(filename, "utf8")
const compile = (text) => ts.transpileModule(text, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const compiled = compile(source)

function load(bindings = {}) {
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, ...bindings }, { filename, timeout: 1000 })
  return module.exports
}

function harness({ fallback = false, constructorThrows = false, resumeRejects = false, resumeThrows = false } = {}) {
  const calls = { constructor: 0, resume: 0, oscillators: 0, gains: 0, starts: 0 }
  const parameter = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} })
  class FakeAudioContext {
    state = "suspended"
    currentTime = 0
    destination = {}
    constructor() {
      calls.constructor++
      if (constructorThrows) throw new Error("Audio device unavailable")
    }
    resume() {
      calls.resume++
      if (resumeThrows) throw new Error("Resume blocked")
      if (resumeRejects) return Promise.reject(new Error("Resume rejected"))
      this.state = "running"
      return Promise.resolve()
    }
    createOscillator() {
      calls.oscillators++
      return { frequency: parameter(), connect(node) { return node }, start() { calls.starts++ }, stop() {} }
    }
    createGain() {
      calls.gains++
      return { gain: parameter(), connect(node) { return node } }
    }
  }
  const audio = load({ window: { [fallback ? "webkitAudioContext" : "AudioContext"]: FakeAudioContext } })
  return { audio, calls }
}

let checks = 0
async function check(name, test) {
  await test()
  checks++
  console.log(`OK ${name}`)
}

await check("Preparação cria um contexto uma vez, sem retomar nem produzir som", () => {
  const { audio, calls } = harness()
  for (let index = 0; index < 12; index++) audio.prepareGameAudio()
  assert.deepEqual(calls, { constructor: 1, resume: 0, oscillators: 0, gains: 0, starts: 0 })
})

await check("Gesto retoma o contexto preparado e o primeiro passo não o recria", () => {
  const { audio, calls } = harness()
  audio.prepareGameAudio()
  audio.unlockGameAudio()
  assert.equal(calls.resume, 1)
  assert.equal(calls.starts, 0)
  audio.playGameSound("step")
  audio.prepareGameAudio()
  audio.unlockGameAudio()
  assert.deepEqual(calls, { constructor: 1, resume: 1, oscillators: 1, gains: 1, starts: 1 })
})

await check("Módulo preserva uso sem preparação e o fallback WebKit", () => {
  for (const fallback of [false, true]) {
    const { audio, calls } = harness({ fallback })
    audio.unlockGameAudio()
    audio.playGameSound("step")
    audio.prepareGameAudio()
    assert.equal(calls.constructor, 1)
    assert.equal(calls.resume, 1)
    assert.equal(calls.starts, 1)
  }
})

await check("SSR e navegador sem Web Audio continuam sem erro", () => {
  for (const bindings of [{}, { window: {} }]) {
    const audio = load(bindings)
    for (let index = 0; index < 3; index++) {
      assert.doesNotThrow(() => audio.prepareGameAudio())
      assert.doesNotThrow(() => audio.unlockGameAudio())
      assert.doesNotThrow(() => audio.playGameSound("step"))
    }
  }
})

await check("Construtor indisponível falha uma única vez sem interromper o jogo", () => {
  const { audio, calls } = harness({ constructorThrows: true })
  for (let index = 0; index < 5; index++) {
    assert.doesNotThrow(() => audio.prepareGameAudio())
    assert.doesNotThrow(() => audio.unlockGameAudio())
    assert.doesNotThrow(() => audio.playGameSound("step"))
  }
  assert.deepEqual(calls, { constructor: 1, resume: 0, oscillators: 0, gains: 0, starts: 0 })
})

await check("Retomada recusada não lança erro nem rejeição não tratada", async () => {
  for (const options of [{ resumeThrows: true }, { resumeRejects: true }]) {
    const { audio, calls } = harness(options)
    audio.prepareGameAudio()
    assert.doesNotThrow(() => audio.unlockGameAudio())
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(calls.constructor, 1)
    assert.equal(calls.resume, 1)
    assert.equal(calls.starts, 0)
  }
})

const scenePath = "app/(game)/games/deducao/[roomId]/scene/office-scene.tsx"
const sceneText = await readFile(scenePath, "utf8")
const sceneSource = ts.createSourceFile(scenePath, sceneText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const sceneContent = sceneSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "SceneContent")
assert.ok(sceneContent, "SceneContent real precisa participar do teste")
const effects = []
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(sceneSource) === "useEffect" && node.arguments[0]?.getText(sceneSource).includes("prepareScene(")) effects.push(node)
  ts.forEachChild(node, visit)
}
visit(sceneContent)
assert.equal(effects.length, 1, "A preparação de áudio deve integrar o único aquecimento real da cena")
const warmup = effects[0]
const callback = warmup.arguments[0]
assert.match(callback.getText(sceneSource), /prepareGameAudio\(\)/)
const dependencies = warmup.arguments[1].getText(sceneSource)
assert.ok(!/blackout|currentLevel|floor|snapshot/.test(dependencies), "Subir escada ou alternar apagão não pode reiniciar a preparação")
const printer = ts.createPrinter()
const warmupCode = compile(`module.exports = ${printer.printNode(ts.EmitHint.Unspecified, callback, sceneSource)};`)

await check("Aquecimento inicial prepara áudio antes de sceneReady sem recriar nas próximas cenas", async () => {
  for (const constructorThrows of [false, true]) {
    const { audio, calls } = harness({ constructorThrows })
    const events = []
    const module = { exports: {} }
    vm.runInNewContext(warmupCode, {
      module, AbortController, gl: {}, scene: {}, camera: {}, quality: "alto", console,
      prepareGameAudio: () => { audio.prepareGameAudio(); events.push("audio") },
      prepareScene: () => { events.push("scene"); return Promise.resolve() },
      onReady: () => events.push("ready"),
    }, { filename: scenePath, timeout: 1000 })
    const cleanup = module.exports()
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(events, ["audio", "scene", "ready"])
    cleanup()
    const cleanupAgain = module.exports()
    await new Promise((resolve) => setImmediate(resolve))
    cleanupAgain()
    assert.equal(calls.constructor, 1)
    assert.equal(calls.resume, 0)
    assert.equal(calls.starts, 0)
  }
})

console.log(`Áudio validado: ${checks} verificações, sem dispositivo de áudio real.`)
