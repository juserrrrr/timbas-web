import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"

const source = readFileSync(new URL("../app/(game)/games/deducao/[roomId]/touch-controls.tsx", import.meta.url), "utf8")
let currentHooks
let environment

function eventBus() {
  const handlers = new Map()
  return {
    addEventListener(type, fn) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn) },
    removeEventListener(type, fn) { handlers.get(type)?.delete(fn) },
    dispatch(type, event = {}) { for (const fn of [...(handlers.get(type) ?? [])]) fn(event) },
    count() { return [...handlers.values()].reduce((sum, value) => sum + value.size, 0) },
    types() { return [...handlers].filter(([, value]) => value.size).map(([key]) => key) },
  }
}

function makeEnvironment(coarse = true) {
  const media = { ...eventBus(), matches: coarse }
  return {
    window: { ...eventBus(), matchMedia(query) { assert.match(query, /any-pointer: coarse/); return media } },
    document: { ...eventBus(), hidden: false }, media, audio: 0,
  }
}

class Element {
  constructor() { this.style = {}; this.dataset = {}; this.attributes = {}; this.captures = new Set() }
  setPointerCapture(id) { this.captures.add(id) }
  hasPointerCapture(id) { return this.captures.has(id) }
  releasePointerCapture(id) {
    this.captures.delete(id)
    this.props.onLostPointerCapture?.({ pointerId: id, currentTarget: this })
  }
  getBoundingClientRect() { return { left: 12, top: 100, width: 112, height: 112 } }
  setAttribute(key, value) { this.attributes[key] = value }
}

const react = {
  useRef(value) { const hooks = currentHooks; return hooks.slots[hooks.index++] ??= { current: value } },
  useState(initial) {
    const hooks = currentHooks, index = hooks.index++
    if (!(index in hooks.slots)) hooks.slots[index] = initial
    return [hooks.slots[index], (next) => { const value = typeof next === "function" ? next(hooks.slots[index]) : next; if (!Object.is(value, hooks.slots[index])) { hooks.slots[index] = value; hooks.dirty = true } }]
  },
  useCallback(callback, deps) {
    const hooks = currentHooks, index = hooks.index++, previous = hooks.slots[index]
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) hooks.slots[index] = { deps, callback }
    return hooks.slots[index].callback
  },
  useEffect(callback, deps) {
    const hooks = currentHooks, index = hooks.index++, previous = hooks.slots[index]
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
      hooks.effects.push(() => { previous?.cleanup?.(); hooks.slots[index] = { deps, cleanup: callback() } })
    }
  },
}
const jsx = (type, props) => ({ type, props })
const module = { exports: {} }
const context = vm.createContext({ get window() { return environment.window }, get document() { return environment.document } })
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText
vm.runInContext(`(function(require,module,exports) { ${output}\n})`, context)(
  (name) => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx }
    : name === "@/lib/games/game-audio" ? { unlockGameAudio() { environment.audio++ } }
      : { ArrowUp() {}, ChevronsUp() {}, Footprints() {} }, module, module.exports,
)
const { TouchControls } = module.exports
const idle = () => ({ x: 0, z: 0, sprint: false, crouch: false, jumpSerial: 0 })

function fixture(options = {}) {
  environment = makeEnvironment(options.coarse ?? true)
  const hooks = { slots: [], index: 0, effects: [], dirty: false, renders: 0 }
  const inputRef = { current: idle() }
  const elements = new Map()
  let props = { inputRef, enabled: true, forceVisible: false, ...options }
  let tree
  function attach(node) {
    if (!node || typeof node !== "object") return
    const key = node.props?.["aria-label"] || (node.props?.ref ? "knob" : null)
    if (key) {
      const element = elements.get(key) ?? new Element()
      elements.set(key, element)
      element.props = node.props
      element.attributes["aria-pressed"] = String(node.props["aria-pressed"])
      element.dataset.active = String(node.props["data-active"])
      if (typeof node.props.ref === "function") node.props.ref(element)
      else if (node.props.ref) node.props.ref.current = element
    }
    for (const child of [node.props?.children].flat(Infinity)) attach(child)
  }
  function render(patch = {}) {
    props = { ...props, ...patch }
    let turns = 0
    do {
      assert.ok(++turns < 10, "Sem ciclo de renderização")
      hooks.renders++; hooks.index = 0; hooks.dirty = false; hooks.effects = []; currentHooks = hooks
      tree = TouchControls(props)
      attach(tree)
      for (const effect of hooks.effects) effect()
    } while (hooks.dirty)
  }
  render()
  return { input: inputRef.current, inputRef, elements, hooks, render, get tree() { return tree },
    unmount() { for (const slot of hooks.slots) slot?.cleanup?.() },
    pointer(label, eventName, id = 1, extra = {}) {
      const element = elements.get(label)
      assert.ok(element, label)
      const event = { currentTarget: element, pointerId: id, pointerType: "touch", button: 0, clientX: 68, clientY: 156,
        prevented: false, stopped: false, preventDefault() { this.prevented = true }, stopPropagation() { this.stopped = true }, ...extra }
      element.props[eventName]?.(event)
      if (hooks.dirty) render()
      return event
    },
    click(label, detail = 1) { elements.get(label).props.onClick({ detail }); if (hooks.dirty) render() },
  }
}

const checks = []
const test = (name, run) => checks.push({ name, run })
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`)
const neutral = (f, jumpSerial = 0) => assert.deepEqual(f.input, { ...idle(), jumpSerial })
const move = (f, id = 1) => { f.pointer("Manche de movimento", "onPointerDown", id); f.pointer("Manche de movimento", "onPointerMove", id, { clientX: 100 }) }

test("Mouse fino não mostra controles; hardware híbrido e opção manual mostram", () => {
  const f = fixture({ coarse: false })
  assert.equal(f.tree, null)
  assert.deepEqual(environment.window.types(), [])
  environment.media.matches = true; environment.media.dispatch("change"); f.render()
  assert.ok(f.tree?.props["data-touch-controls"] !== undefined)
  environment.media.matches = false; environment.media.dispatch("change"); f.render()
  assert.equal(f.tree, null)
  f.render({ forceVisible: true })
  assert.ok(f.tree)
  f.unmount()
})

test("Manche fixo usa deadzone e vetor diagonal limitado, sem renders por movimento", () => {
  const f = fixture(), initialRenders = f.hooks.renders
  const down = f.pointer("Manche de movimento", "onPointerDown")
  assert.ok(down.prevented && down.stopped)
  assert.ok(f.elements.get("Manche de movimento").hasPointerCapture(1))
  f.pointer("Manche de movimento", "onPointerMove", 1, { clientX: 70 })
  close(f.input.x, 0)
  f.pointer("Manche de movimento", "onPointerMove", 1, { clientX: 100 })
  close(f.input.x, 1); close(f.input.z, 0)
  for (let i = 0; i < 120; i++) f.pointer("Manche de movimento", "onPointerMove", 1, { clientX: 150, clientY: 238 })
  close(Math.hypot(f.input.x, f.input.z), 1)
  assert.equal(f.hooks.renders, initialRenders)
  assert.equal(f.hooks.dirty, false)
  f.unmount()
})

test("Outro dedo não rouba o manche e eventos globais não viram movimento", () => {
  const f = fixture()
  move(f)
  f.pointer("Manche de movimento", "onPointerDown", 2, { clientX: 20 })
  f.pointer("Manche de movimento", "onPointerMove", 2, { clientX: 20 })
  f.pointer("Manche de movimento", "onPointerUp", 2)
  close(f.input.x, 1)
  environment.window.dispatch("pointermove", { pointerId: 99, clientX: 20 })
  environment.window.dispatch("touchmove", { changedTouches: [{ identifier: 99 }] })
  close(f.input.x, 1)
  assert.deepEqual(environment.window.types(), ["blur"])
  assert.deepEqual(environment.document.types(), ["visibilitychange"])
  f.pointer("Manche de movimento", "onPointerUp", 1)
  neutral(f)
  f.unmount()
})

test("Mover, olhar com outro dedo e Pular funcionam juntos sem foco ou clique duplicado", () => {
  const f = fixture()
  move(f)
  const action = f.pointer("Pular", "onPointerDown", 3, { isPrimary: false })
  assert.ok(action.prevented && action.stopped)
  assert.equal(f.input.jumpSerial, 1); close(f.input.x, 1)
  f.pointer("Pular", "onPointerDown", 4)
  assert.equal(f.input.jumpSerial, 1)
  f.pointer("Pular", "onPointerUp", 3)
  f.click("Pular", 1)
  assert.equal(f.input.jumpSerial, 1)
  f.pointer("Pular", "onPointerDown", 5)
  assert.equal(f.input.jumpSerial, 2)
  f.pointer("Pular", "onPointerUp", 5)
  f.pointer("Manche de movimento", "onPointerUp")
  neutral(f, 2)
  f.unmount()
})

test("Correr e Agachar são exclusivos, preservam movimento e sobrevivem a rerender do HUD", () => {
  const f = fixture()
  move(f)
  for (const label of ["Correr", "Agachar"]) {
    f.pointer(label, "onPointerDown", 2); f.pointer(label, "onPointerUp", 2)
    assert.equal(f.elements.get(label).attributes["aria-pressed"], "true")
    assert.equal(f.elements.get(label).dataset.active, "true")
  }
  assert.equal(f.input.sprint, false)
  assert.equal(f.elements.get("Correr").attributes["aria-pressed"], "false")
  f.render()
  assert.equal(f.elements.get("Agachar").attributes["aria-pressed"], "true")
  f.pointer("Manche de movimento", "onPointerMove", 1, { clientX: 36 })
  close(f.input.x, -1)
  assert.ok(!f.input.sprint && f.input.crouch)
  f.pointer("Manche de movimento", "onPointerUp")
  assert.ok(!f.input.sprint && f.input.crouch)
  f.pointer("Correr", "onPointerDown", 2); f.pointer("Correr", "onPointerUp", 2)
  assert.ok(f.input.sprint && !f.input.crouch)
  f.render()
  assert.equal(f.elements.get("Correr").attributes["aria-pressed"], "true")
  assert.equal(f.elements.get("Agachar").attributes["aria-pressed"], "false")
  f.pointer("Correr", "onPointerDown", 2); f.pointer("Correr", "onPointerUp", 2)
  neutral(f)
  f.unmount()
})

test("Cancelamento e perda inesperada da captura liberam todos os dedos e modos", () => {
  for (const label of ["Manche de movimento", "Correr"]) for (const event of ["onPointerCancel", "onLostPointerCapture"]) {
    const f = fixture()
    move(f)
    f.pointer("Correr", "onPointerDown", 2)
    f.pointer(label, event, label === "Correr" ? 2 : 1)
    neutral(f)
    for (const element of f.elements.values()) assert.equal(element.captures.size, 0)
    assert.equal(f.elements.get("Correr").attributes["aria-pressed"], "false")
    f.unmount()
  }
})

test("Blur, página oculta, desabilitar, remover hardware e desmontar nunca deixam entrada presa", () => {
  for (const cause of ["blur", "hidden", "disabled", "hardware", "unmount"]) {
    const f = fixture()
    move(f)
    f.pointer("Agachar", "onPointerDown", 2)
    f.pointer("Pular", "onPointerDown", 3)
    if (cause === "blur") environment.window.dispatch("blur")
    if (cause === "hidden") { environment.document.hidden = true; environment.document.dispatch("visibilitychange") }
    if (cause === "disabled") f.render({ enabled: false })
    if (cause === "hardware") { environment.media.matches = false; environment.media.dispatch("change"); f.render() }
    if (cause === "unmount") f.unmount()
    neutral(f, 1)
    for (const element of f.elements.values()) assert.equal(element.captures.size, 0)
    if (cause !== "unmount") f.unmount()
    assert.equal(environment.window.count() + environment.document.count() + environment.media.count(), 0)
  }
})

test("Desabilitado não aceita gestos; botões têm ativação acessível por teclado", () => {
  const f = fixture({ enabled: false })
  move(f)
  f.pointer("Pular", "onPointerDown", 2); f.click("Pular", 0)
  neutral(f)
  f.render({ enabled: true })
  f.click("Pular", 0); f.click("Agachar", 0); f.click("Correr", 0)
  assert.equal(f.input.jumpSerial, 1)
  assert.ok(!f.input.crouch && f.input.sprint)
  f.render({ enabled: false })
  neutral(f, 1)
  f.unmount()
})

test("Desmontagem sem gesto não apaga entradas de teclado de um desktop", () => {
  const inputRef = { current: { x: 1, z: 0, sprint: true, crouch: false, jumpSerial: 7 } }
  const f = fixture({ coarse: false, inputRef })
  f.unmount()
  assert.deepEqual(inputRef.current, { x: 1, z: 0, sprint: true, crouch: false, jumpSerial: 7 })
})

test("Opção manual aceita mouse principal, ignora botão direito e limpa ao ser escondida", () => {
  const f = fixture({ coarse: false, forceVisible: true })
  f.pointer("Manche de movimento", "onPointerDown", 1, { pointerType: "mouse", button: 2 })
  f.pointer("Pular", "onPointerDown", 2, { pointerType: "mouse", button: 2 })
  neutral(f)
  move(f)
  f.pointer("Correr", "onPointerDown", 2, { pointerType: "mouse" })
  f.pointer("Correr", "onPointerUp", 2)
  f.render({ forceVisible: false })
  neutral(f)
  assert.equal(f.tree, null)
  f.unmount()
})

for (const { name, run } of checks) { run(); console.log(`PASS ${name}`) }
console.log(`${checks.length}/${checks.length} verificações de toque passaram.`)
