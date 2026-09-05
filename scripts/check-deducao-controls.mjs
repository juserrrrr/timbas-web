import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import ts from "typescript"
import babel from "next/dist/compiled/babel/core.js"
import reactCompiler from "babel-plugin-react-compiler"

const root = new URL("../", import.meta.url)
const directory = "app/(game)/games/deducao/[roomId]/"
const source = (name) => readFileSync(new URL(directory + name, root), "utf8")
let currentHooks

class MockElement {
  constructor(tag = "canvas", parent = null, attributes = {}) {
    this.tagName = tag
    this.parentElement = parent
    this.attributes = attributes
  }
  closest() {
    const roles = ["textbox", "combobox", "listbox", "slider", "spinbutton", "button"]
    for (let node = this; node; node = node.parentElement) {
      if (["input", "textarea", "select", "button"].includes(node.tagName)
        || (node.tagName === "a" && node.attributes.href)
        || (node.attributes.contenteditable !== undefined && node.attributes.contenteditable !== "false")
        || roles.includes(node.attributes.role)) return node
    }
    return null
  }
  blur() { environment.document.activeElement = null }
}

function eventBus() {
  const listeners = new Map()
  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(handler)
    },
    removeEventListener(type, handler) { listeners.get(type)?.delete(handler) },
    dispatch(type, event = {}) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event)
    },
    listenerCount() { return [...listeners.values()].reduce((sum, handlers) => sum + handlers.size, 0) },
  }
}

function createEnvironment() {
  const timers = new Map()
  let serial = 0
  return {
    now: 0,
    document: { ...eventBus(), activeElement: null, pointerLockElement: null, hidden: false },
    window: {
      ...eventBus(), innerWidth: 1000,
      localStorage: { getItem: () => null, setItem() {} },
      setTimeout(callback) { timers.set(++serial, callback); return serial },
      clearTimeout(id) { timers.delete(id) },
    },
    runTimers() { for (const [id, callback] of [...timers]) { timers.delete(id); callback() } },
    timerCount() { return timers.size },
  }
}

let environment = createEnvironment()
const react = {
  useState(initial) {
    const hooks = currentHooks
    const index = hooks.index++
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? initial() : initial
    return [hooks.slots[index], (next) => {
      const value = typeof next === "function" ? next(hooks.slots[index]) : next
      if (!Object.is(value, hooks.slots[index])) { hooks.slots[index] = value; hooks.dirty = true }
    }]
  },
  useRef(initial) {
    const hooks = currentHooks
    const index = hooks.index++
    return hooks.slots[index] ??= { current: initial }
  },
  useMemo(factory, dependencies) {
    const hooks = currentHooks
    const index = hooks.index++
    const previous = hooks.slots[index]
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
      hooks.slots[index] = { value: factory(), dependencies }
    }
    return hooks.slots[index].value
  },
  useCallback(callback, dependencies) { return react.useMemo(() => callback, dependencies) },
  useEffect(callback, dependencies) {
    const hooks = currentHooks
    const index = hooks.index++
    const previous = hooks.slots[index]
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
      hooks.effects.push(() => {
        previous?.cleanup?.()
        hooks.slots[index] = { dependencies, cleanup: callback() }
      })
    }
  },
}

const components = new Map()
const placeholder = (name) => {
  if (!components.has(name)) components.set(name, Object.assign(() => null, { displayName: name }))
  return components.get(name)
}
const jsx = (type, props) => ({ type, props })
const context = vm.createContext({
  Element: MockElement, HTMLElement: MockElement,
  performance: { now: () => environment.now },
  get window() { return environment.window },
  get document() { return environment.document },
})
const noTargets = { task: null, kill: null, vent: null, corpse: null, emergency: false }
const modules = new Map()

function load(name, expose = "", transform = (value) => value) {
  const output = ts.transpileModule(transform(source(name) + expose), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    fileName: name,
  }).outputText
  const module = { exports: {} }
  const require = (id) => {
    if (id === "react") return react
    if (id === "react/compiler-runtime") return { c: (size) => react.useMemo(() => Array(size).fill(Symbol.for("react.memo_cache_sentinel")), []) }
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" }
    if (id === "./keyboard-controls") return modules.get("keyboard-controls.ts")
    if (id === "./sabotage-cooldown") return modules.get("sabotage-cooldown.ts")
    if (id === "./match-types") return { NO_TARGETS: noTargets }
    if (id === "./use-proximity-voice") return { useProximityVoice: () => ({}) }
    if (id === "@/lib/games/game-audio") return { playGameSound() {}, unlockGameAudio() {} }
    return new Proxy({}, { get: (_, property) => placeholder(property) })
  }
  vm.runInContext(`(function(require, module, exports) { ${output}\n})`, context, { filename: fileURLToPath(new URL(directory + name, root)) })(require, module, module.exports)
  modules.set(name, module.exports)
  return module.exports
}

const { gameKeyCode, isGameControlTarget } = load("keyboard-controls.ts")
const { calibrateSabotageStatus } = load("sabotage-cooldown.ts")
const { Match } = load("match.tsx")
const { Hud, TouchStick, ActionButton, SabotageButton } = load("hud.tsx", "\nexport { TouchStick, ActionButton }\n")

function mount(component, initialProps) {
  const hooks = { index: 0, slots: [], effects: [], dirty: false }
  let props = initialProps
  let tree
  const render = (nextProps = props) => {
    props = nextProps
    let renders = 0
    do {
      assert.ok(++renders < 20, "Effect render loop")
      hooks.index = 0
      hooks.dirty = false
      hooks.effects = []
      currentHooks = hooks
      tree = component(props)
      for (const effect of hooks.effects) effect()
    } while (hooks.dirty)
    return tree
  }
  render()
  return {
    render,
    get tree() { return tree },
    unmount() { for (const slot of hooks.slots) slot?.cleanup?.() },
  }
}

function find(tree, type) {
  if (!tree || typeof tree !== "object") return null
  if (tree.type === type) return tree
  for (const child of [tree.props?.children].flat(Infinity)) {
    const match = find(child, type)
    if (match) return match
  }
  return null
}

const keyEvent = (code, fields = {}) => ({
  code, key: code, target: new MockElement(), defaultPrevented: false,
  repeat: false, isComposing: false, altKey: false, metaKey: false, ctrlKey: false,
  preventDefault() { this.defaultPrevented = true }, ...fields,
})
const down = (code, fields) => { const event = keyEvent(code, fields); environment.window.dispatch("keydown", event); return event }
const up = (code, fields) => environment.window.dispatch("keyup", keyEvent(code, fields))
const touch = (id, x, y) => ({ identifier: id, clientX: x, clientY: y })
const touchEvent = (touches, target = new MockElement()) => ({ target, changedTouches: touches, preventDefault() {} })
const idleInput = () => ({ x: 0, z: 0, sprint: false, crouch: false, jumpSerial: 0 })
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`)

function matchFixture() {
  environment = createEnvironment()
  const sends = []
  let props = {
    map: { taskSpots: [], rooms: [], vents: [] },
    snapshot: { phase: "jogando", blackout: false, players: [{ id: "me", alive: true, emergenciesLeft: 1 }] },
    roomRef: { current: null }, me: "me", role: "assassino", allies: [], myTasks: [], finalRoles: {}, notices: [],
    sabotageStatus: calibrateSabotageStatus({ readyAt: 0, serverNow: 10_000, cooldownMs: 40_000 }),
    onSend: (...args) => sends.push(args), onLeave() {},
  }
  const mounted = mount(Match, props)
  const scene = () => find(mounted.tree, placeholder("OfficeScene")).props
  const hud = () => find(mounted.tree, placeholder("Hud")).props
  scene().onReady()
  mounted.render()
  environment.runTimers()
  mounted.render()
  assert.equal(scene().controlsEnabled, true)
  return { ...mounted, scene, hud, input: () => scene().inputRef.current, sends,
    render: mounted.render,
    update(patch) { props = { ...props, ...patch }; mounted.render(props) },
  }
}

const checks = []
const test = (name, run) => checks.push({ name, run })

test("physical codes and legacy key aliases", () => {
  for (const [event, expected] of [
    [{ code: "KeyW", key: "z" }, "KeyW"], [{ code: "", key: "w" }, "KeyW"],
    [{ code: "Unidentified", key: "E" }, "KeyE"], [{ code: "", key: " " }, "Space"],
    [{ code: "", key: "Spacebar" }, "Space"], [{ code: "", key: "Control" }, "ControlLeft"],
    [{ code: "", key: "Shift" }, "ShiftLeft"], [{ code: "", key: "Up" }, "ArrowUp"],
    [{ code: "", key: "Esc" }, "Escape"], [{ code: "", key: "2" }, "Digit2"],
  ]) assert.equal(gameKeyCode(event), expected)
})

test("interactive targets and nested icons exclude game controls", () => {
  for (const node of [new MockElement("input"), new MockElement("textarea"), new MockElement("select"),
    new MockElement("button"), new MockElement("a", null, { href: "/" }),
    new MockElement("div", null, { contenteditable: "true" }), new MockElement("div", null, { role: "slider" })]) {
    assert.equal(isGameControlTarget(node), true)
    assert.equal(isGameControlTarget(new MockElement("svg", node)), true)
  }
  assert.equal(isGameControlTarget(null), false)
  assert.equal(isGameControlTarget(new MockElement()), false)
  assert.equal(isGameControlTarget(new MockElement("div", null, { contenteditable: "false" })), false)
})

test("WASD, arrow aliases, opposites, diagonal normalization and independent releases", () => {
  const fixture = matchFixture()
  for (const [code, x, z] of [["KeyW", 0, -1], ["ArrowUp", 0, -1], ["KeyS", 0, 1], ["ArrowDown", 0, 1], ["KeyA", -1, 0], ["ArrowLeft", -1, 0], ["KeyD", 1, 0], ["ArrowRight", 1, 0]]) {
    assert.equal(down(code).defaultPrevented, true)
    close(fixture.input().x, x); close(fixture.input().z, z)
    up(code)
    close(fixture.input().x, 0); close(fixture.input().z, 0)
  }
  down("KeyW"); down("ArrowUp"); down("KeyD")
  close(fixture.input().x, Math.SQRT1_2); close(fixture.input().z, -Math.SQRT1_2)
  up("KeyW")
  close(fixture.input().z, -Math.SQRT1_2)
  down("KeyS")
  close(fixture.input().z, 0); close(fixture.input().x, 1)
  fixture.unmount()
})

test("sprint/crouch modifiers and jump repeats", () => {
  const fixture = matchFixture()
  down("ShiftLeft"); down("ShiftRight"); up("ShiftLeft")
  assert.equal(fixture.input().sprint, true)
  up("ShiftRight"); assert.equal(fixture.input().sprint, false)
  down("ControlLeft"); down("KeyC"); up("ControlLeft")
  assert.equal(fixture.input().crouch, true)
  up("KeyC"); assert.equal(fixture.input().crouch, false)
  down("Space"); down("Space", { repeat: true })
  assert.equal(fixture.input().jumpSerial, 1)
  up("Space"); down("Space")
  assert.equal(fixture.input().jumpSerial, 2)
  fixture.unmount()
})

test("blur, hidden document, UI focus and pointer unlock reset held keys", () => {
  for (const reset of [
    () => environment.window.dispatch("blur"),
    () => { environment.document.hidden = true; environment.document.dispatch("visibilitychange") },
    () => environment.document.dispatch("focusin", { target: new MockElement("input") }),
    () => environment.document.dispatch("pointerlockchange"),
  ]) {
    const fixture = matchFixture()
    down("KeyW"); down("ShiftLeft"); down("ControlLeft")
    reset()
    close(fixture.input().z, 0)
    assert.equal(fixture.input().sprint, false); assert.equal(fixture.input().crouch, false)
    down("KeyW", { repeat: true }); close(fixture.input().z, 0)
    up("KeyW"); down("KeyW"); close(fixture.input().z, -1)
    fixture.unmount()
  }
})

test("text/select/button focus, IME and modifier shortcuts never move or send actions", () => {
  const fixture = matchFixture()
  for (const target of [new MockElement("input"), new MockElement("select"), new MockElement("button")]) {
    down("KeyW", { target }); down("KeyF", { target })
    close(fixture.input().z, 0)
    environment.document.activeElement = target
    down("KeyW"); down("KeyF")
    environment.document.activeElement = null
  }
  for (const flags of [{ isComposing: true }, { altKey: true }, { metaKey: true }, { defaultPrevented: true }]) {
    down("KeyW", flags); down("KeyF", flags)
  }
  assert.equal(fixture.sends.length, 0); close(fixture.input().z, 0)
  fixture.unmount()
})

test("modal map, task and meeting gate input and clear movement", () => {
  const fixture = matchFixture()
  down("KeyW"); fixture.hud().onMapOpenChange(true); fixture.render()
  assert.equal(fixture.scene().controlsEnabled, false); close(fixture.input().z, 0)
  down("KeyD"); down("KeyF"); assert.equal(fixture.sends.length, 0)
  fixture.hud().onMapOpenChange(false); fixture.render()
  down("KeyW", { repeat: true }); close(fixture.input().z, 0)
  fixture.scene().onTargets({ ...noTargets, task: { id: "task-1" } }); fixture.render()
  down("KeyE"); fixture.render()
  assert.equal(fixture.sends[0][0], "task:begin"); assert.equal(fixture.scene().controlsEnabled, false)
  fixture.update({ snapshot: { phase: "reuniao", blackout: false, players: [{ id: "me", alive: true }] } })
  assert.equal(fixture.scene().controlsEnabled, false)
  down("KeyF"); assert.equal(fixture.sends.length, 1)
  fixture.unmount()
})

test("actions fire once, honor targets, alive status and role", () => {
  const fixture = matchFixture()
  fixture.scene().onTargets({ ...noTargets, kill: { id: "victim" }, corpse: { id: "corpse" }, vent: { id: "vent", links: ["a", "b"] } })
  fixture.render()
  for (const code of ["KeyQ", "KeyF", "KeyR", "KeyV"]) { down(code); down(code, { repeat: true }) }
  assert.deepEqual(fixture.sends.map(([name]) => name), ["kill", "sabotage", "report", "vent"])
  fixture.update({ snapshot: { phase: "jogando", blackout: false, players: [{ id: "me", alive: false }] } })
  for (const code of ["KeyQ", "KeyF", "KeyR", "KeyV"]) down(code)
  assert.equal(fixture.sends.length, 4)
  fixture.unmount()
  const employee = matchFixture()
  employee.update({ role: "funcionario" })
  environment.runTimers(); employee.render()
  employee.scene().onTargets({ ...noTargets, kill: { id: "victim" }, vent: { id: "vent", links: [] } }); employee.render()
  for (const code of ["KeyQ", "KeyF", "KeyV"]) down(code)
  assert.equal(employee.sends.length, 0)
  employee.unmount()
})

test("vent exits and linked destinations work without key repeats", () => {
  const fixture = matchFixture()
  fixture.update({ snapshot: { phase: "jogando", blackout: false, players: [{ id: "me", alive: true, inVent: true }] } })
  fixture.scene().onTargets({ ...noTargets, vent: { id: "vent", links: ["a", "b"] } }); fixture.render()
  down("Digit1"); down("Digit2"); down("Digit2", { repeat: true }); down("KeyV")
  assert.deepEqual(fixture.sends.map(([, payload]) => payload.ventId), ["a", "b", ""])
  fixture.unmount()
})

test("F and sabotage button share calibrated cooldown, blackout and connection restrictions", () => {
  const fixture = matchFixture()
  down("KeyF")
  fixture.hud().onSabotage()
  assert.equal(fixture.sends.length, 2)
  const status = calibrateSabotageStatus({ readyAt: 140_000, serverNow: 100_000, cooldownMs: 40_000 })
  fixture.update({ sabotageStatus: status })
  for (const now of [0, 1_000, 39_999]) {
    environment.now = now
    down("KeyF")
    fixture.hud().onSabotage()
    assert.equal(fixture.sends.length, 2)
  }
  environment.now = 40_000
  down("KeyF")
  fixture.hud().onSabotage()
  assert.equal(fixture.sends.length, 4)
  for (const snapshot of [
    { phase: "jogando", blackout: true, players: [{ id: "me", alive: true }] },
    { phase: "jogando", blackout: false, players: [{ id: "me", alive: true, connected: false }] },
    { phase: "jogando", blackout: false, players: [{ id: "me", alive: false }] },
  ]) {
    fixture.update({ snapshot })
    down("KeyF")
    fixture.hud().onSabotage()
    assert.equal(fixture.sends.length, 4)
  }
  fixture.update({ snapshot: { phase: "jogando", blackout: false, players: [{ id: "me", alive: true, inVent: true }] } })
  down("KeyF")
  fixture.hud().onSabotage()
  assert.equal(fixture.sends.length, 6, "Duto preserva a permissão existente no servidor")
  fixture.unmount()
})

test("sabotage countdown redraws its button only and cleans up timers on ready, resync and unmount", () => {
  environment = createEnvironment()
  let props = {
    snapshot: { phase: "jogando", blackout: false, players: [{ id: "me", alive: true, inVent: false }] },
    me: "me", role: "assassino", controlsEnabled: true, onSabotage() {},
    status: calibrateSabotageStatus({ readyAt: 940_000, serverNow: 900_000, cooldownMs: 40_000 }),
  }
  const mounted = mount(SabotageButton, props)
  assert.equal(mounted.tree.props.label, "Recarga · 40s")
  assert.equal(mounted.tree.props.disabled, true)
  assert.equal(environment.timerCount(), 1)
  environment.now = 1_000
  environment.runTimers()
  mounted.render()
  assert.equal(mounted.tree.props.label, "Recarga · 39s")
  environment.now = 40_000
  environment.runTimers()
  mounted.render()
  assert.equal(mounted.tree.props.label, "Apagar a luz")
  assert.equal(mounted.tree.props.disabled, false)
  assert.equal(environment.timerCount(), 0)
  props = { ...props, snapshot: { ...props.snapshot, blackout: true } }
  mounted.render(props)
  assert.equal(mounted.tree.props.label, "Luz apagada")
  assert.equal(mounted.tree.props.disabled, true)
  props = { ...props, status: calibrateSabotageStatus({ readyAt: 955_000, serverNow: 930_000, cooldownMs: 40_000 }) }
  mounted.render(props)
  assert.equal(mounted.tree.props.label, "Recarga · 25s", "Contador é a recarga, não a duração do apagão")
  assert.equal(environment.timerCount(), 1)
  props = { ...props, status: null }
  mounted.render(props)
  assert.equal(mounted.tree.props.label, "Sincronizando")
  assert.equal(mounted.tree.props.disabled, true)
  assert.equal(environment.timerCount(), 0)
  props = { ...props, status: calibrateSabotageStatus({ readyAt: 980_000, serverNow: 940_000, cooldownMs: 40_000 }) }
  mounted.render(props)
  assert.equal(environment.timerCount(), 1)
  mounted.unmount()
  assert.equal(environment.timerCount(), 0)
})

test("compiled sabotage button releases after 40s with stable props and rejects the implicit-clock regression", () => {
  for (const explicitClock of [false, true]) {
    const { SabotageButton: CompiledButton } = load("hud.tsx", "", (text) => {
      if (!explicitClock) {
        const implicit = text.replace("canSabotage(snapshot, me, role, status, now)", "canSabotage(snapshot, me, role, status)")
        assert.notEqual(implicit, text, "Controle negativo retira apenas a dependência explícita do relógio")
        text = implicit
      }
      const compiled = babel.transformSync(text, {
        filename: "hud.tsx", parserOpts: { plugins: ["jsx", "typescript"] },
        plugins: [reactCompiler], configFile: false, babelrc: false,
      }).code
      assert.ok(compiled.includes("react/compiler-runtime"), "Teste executa o React Compiler real habilitado pelo Next")
      return compiled
    })
    environment = createEnvironment()
    let props = {
      snapshot: { phase: "jogando", blackout: true, players: [{ id: "me", alive: true, connected: true }] },
      me: "me", role: "assassino", controlsEnabled: true, onSabotage() {},
      status: calibrateSabotageStatus({ readyAt: 940_000, serverNow: 900_000, cooldownMs: 40_000 }),
    }
    const mounted = mount(CompiledButton, props)
    assert.equal(mounted.tree.props.disabled, true)
    environment.now = 25_000
    environment.runTimers()
    props = { ...props, snapshot: { ...props.snapshot, blackout: false } }
    mounted.render(props)
    assert.equal(mounted.tree.props.label, "Recarga · 15s")
    assert.equal(mounted.tree.props.disabled, true)
    environment.now = 39_999
    environment.runTimers()
    mounted.render()
    assert.equal(mounted.tree.props.label, "Recarga · 1s")
    assert.equal(mounted.tree.props.disabled, true, "Botão não libera antes do prazo")
    environment.now = 40_000
    environment.runTimers()
    mounted.render()
    assert.equal(mounted.tree.props.label, "Apagar a luz")
    assert.equal(mounted.tree.props.disabled, !explicitClock, "Apenas o relógio explícito invalida o cache da elegibilidade")
    assert.equal(environment.timerCount(), 0)
    environment.now = 90_000
    mounted.render()
    assert.equal(mounted.tree.props.disabled, !explicitClock, "Controle negativo reproduz botão travado após 90s")
    mounted.unmount()
  }
})

test("changing graphics pauses controls until the new scene is ready", () => {
  const fixture = matchFixture()
  down("KeyW"); down("Space")
  fixture.hud().onQuality("baixo"); fixture.render()
  assert.equal(fixture.scene().controlsEnabled, false)
  close(fixture.input().z, 0); assert.equal(fixture.input().jumpSerial, 1)
  down("KeyF"); assert.equal(fixture.sends.length, 0)
  fixture.scene().onReady(); fixture.render()
  assert.equal(fixture.scene().controlsEnabled, true)
  down("KeyW", { repeat: true }); close(fixture.input().z, 0)
  up("KeyW"); down("KeyW"); close(fixture.input().z, -1)
  fixture.unmount()
})

test("map keyboard toggles and focused controls remain usable", () => {
  environment = createEnvironment()
  let props = { snapshot: { players: [], tasksTotal: 0 }, map: { rooms: [], taskSpots: [], vents: [] }, pendingTasks: [], targets: noTargets,
    notices: [], role: null, quality: "baixo", inputRef: { current: idleInput() }, controlsEnabled: true, mapOpen: false, voice: {},
    onMapOpenChange: (open) => { props = { ...props, mapOpen: open, controlsEnabled: !open } },
  }
  const mounted = mount(Hud, props)
  assert.equal(down("KeyM").defaultPrevented, true); mounted.render(props)
  assert.equal(props.mapOpen, true)
  down("KeyM", { repeat: true }); assert.equal(props.mapOpen, true)
  down("Escape", { target: new MockElement("button") }); mounted.render(props)
  assert.equal(props.mapOpen, false)
  down("Tab", { target: new MockElement("select") }); assert.equal(props.mapOpen, false)
  down("Tab"); mounted.render(props); assert.equal(props.mapOpen, true)
  mounted.unmount()
})

test("touch stick clamps diagonal movement and ignores other fingers/end events", () => {
  environment = createEnvironment()
  const inputRef = { current: idleInput() }
  const mounted = mount(TouchStick, { inputRef, enabled: true })
  environment.window.dispatch("touchstart", touchEvent([touch(1, 200, 400)]))
  environment.window.dispatch("touchmove", touchEvent([touch(2, 450, 200)])); close(inputRef.current.x, 0)
  environment.window.dispatch("touchmove", touchEvent([touch(1, 300, 300)]))
  close(inputRef.current.x, Math.SQRT1_2); close(inputRef.current.z, -Math.SQRT1_2)
  environment.window.dispatch("touchend", touchEvent([touch(2, 450, 200)])); close(inputRef.current.x, Math.SQRT1_2)
  environment.window.dispatch("touchcancel", touchEvent([touch(1, 300, 300)])); close(inputRef.current.x, 0)
  mounted.unmount()
})

test("touch controls ignore HUD buttons and right-half camera gestures", () => {
  for (const [x, target] of [[200, new MockElement("button")], [200, new MockElement("svg", new MockElement("button"))], [510, new MockElement()], [900, new MockElement()]]) {
    environment = createEnvironment()
    const inputRef = { current: idleInput() }
    const mounted = mount(TouchStick, { inputRef, enabled: true })
    environment.window.dispatch("touchstart", touchEvent([touch(1, x, 400)], target))
    environment.window.dispatch("touchmove", touchEvent([touch(1, x + 56, 400)], target))
    close(inputRef.current.x, 0)
    mounted.unmount()
  }
})

test("touch blur, hidden, modal disable and focused UI cancel the active finger", () => {
  for (const reset of [
    () => environment.window.dispatch("blur"),
    () => { environment.document.hidden = true; environment.document.dispatch("visibilitychange") },
    (mounted, inputRef) => mounted.render({ inputRef, enabled: false }),
    () => environment.document.dispatch("focusin", { target: new MockElement("select") }),
  ]) {
    environment = createEnvironment()
    const inputRef = { current: idleInput() }
    const mounted = mount(TouchStick, { inputRef, enabled: true })
    environment.window.dispatch("touchstart", touchEvent([touch(1, 200, 400)]))
    environment.window.dispatch("touchmove", touchEvent([touch(1, 256, 400)])); close(inputRef.current.x, 1)
    reset(mounted, inputRef)
    close(inputRef.current.x, 0)
    environment.window.dispatch("touchmove", touchEvent([touch(1, 270, 400)])); close(inputRef.current.x, 0)
    mounted.unmount()
  }
})

test("HUD action buttons expose disabled state and callbacks without touch-stick capture", () => {
  environment = createEnvironment()
  let actions = 0
  const button = ActionButton({ label: "Fazer tarefa", tone: "principal", disabled: true, shortcut: "E", onClick: () => actions++ })
  assert.equal(button.type, "button"); assert.equal(button.props.disabled, true)
  const enabled = ActionButton({ label: "Apagar a luz", tone: "neutro", onClick: () => actions++ })
  enabled.props.onClick()
  assert.equal(actions, 1)
})

test("keyboard and touch listener cleanup prevents stale controls after unmount", () => {
  const fixture = matchFixture()
  fixture.unmount()
  assert.equal(environment.window.listenerCount(), 0)
  assert.equal(environment.document.listenerCount(), 0)
  const inputRef = { current: idleInput() }
  const stick = mount(TouchStick, { inputRef, enabled: true })
  environment.window.dispatch("touchstart", touchEvent([touch(1, 200, 400)]))
  environment.window.dispatch("touchmove", touchEvent([touch(1, 256, 400)]))
  stick.unmount()
  close(inputRef.current.x, 0)
  assert.equal(environment.window.listenerCount(), 0)
  assert.equal(environment.document.listenerCount(), 0)
})

let failures = 0
for (const check of checks) {
  try { check.run(); console.log(`PASS ${check.name}`) }
  catch (error) { failures++; console.error(`FAIL ${check.name}\n${error.stack}`) }
}
console.log(`\nDedução controls: ${checks.length - failures}/${checks.length} checks passed.`)
console.log("Real TypeScript handlers, transpiled with minimal React/DOM mocks. No browser rendering or device performance claim.")
process.exitCode = failures ? 1 : 0
