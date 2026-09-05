import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const directory = "app/(game)/games/deducao/[roomId]/"
let activeHooks
const hooks = {
  useRef(value) { return activeHooks.slots[activeHooks.cursor++] ??= { current: value } },
  useState(value) {
    const current = activeHooks, index = current.cursor++
    if (!(index in current.slots)) current.slots[index] = typeof value === "function" ? value() : value
    return [current.slots[index], (next) => {
      const value = typeof next === "function" ? next(current.slots[index]) : next
      if (!Object.is(value, current.slots[index])) { current.slots[index] = value; current.dirty = true }
    }]
  },
  useEffect(callback, dependencies) {
    const current = activeHooks, index = current.cursor++, previous = current.slots[index]
    if (!previous || dependencies.some((value, at) => !Object.is(value, previous.dependencies[at]))) {
      current.effects.push(() => {
        previous?.cleanup?.()
        current.slots[index] = { dependencies, cleanup: callback() }
      })
    }
  },
}
const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) }
function mount(component, props) {
  const state = { slots: [], cursor: 0, effects: [], dirty: false }
  const render = (next = props) => {
    props = next
    let tree, attempts = 0
    do {
      assert.ok(++attempts < 20, "Efeito não pode gerar um ciclo infinito de renderização")
      state.cursor = 0; state.effects = []; state.dirty = false; activeHooks = state
      tree = component(props)
      for (const effect of state.effects) effect()
    } while (state.dirty)
    return tree
  }
  return { render }
}
async function isolated(filename, names, bindings = {}) {
  const source = ts.createSourceFile(filename, await readFile(directory + filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const statements = source.statements.filter((statement) => ts.isFunctionDeclaration(statement)
    ? names.includes(statement.name?.text)
    : ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => names.includes(declaration.name.text)))
  assert.equal(statements.length, names.length)
  const printer = ts.createPrinter()
  const text = statements.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n")
  const { outputText } = ts.transpileModule(`${text}\nmodule.exports={${names.join(",")}}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, { module, exports: module.exports, React, ...hooks,
    Check: "Check", Copy: "Copy", Lock: "Lock", LogOut: "LogOut", Mic: "Mic", MicOff: "MicOff", Play: "Play", Send: "Send",
    navigator: { clipboard: { writeText: async () => {} } }, toast: { success() {} }, ...bindings })
  return module.exports
}
function all(tree, predicate) {
  const found = tree && typeof tree === "object" && predicate(tree) ? [tree] : []
  for (const child of tree?.props?.children?.flat(Infinity) ?? []) if (child && typeof child === "object") found.push(...all(child, predicate))
  return found
}
function text(tree) {
  if (typeof tree === "string" || typeof tree === "number") return String(tree)
  return (tree?.props?.children?.flat(Infinity) ?? []).map(text).join(" ")
}
const button = (tree, label) => all(tree, (node) => node.type === "button" && text(node).includes(label))[0]
const voiceDefaults = () => ({ enabled: false, configured: false, busy: false, peerCount: 0, error: "", devices: [], selectedDeviceId: "", configure() {}, toggle() {} })
const player = (id, microphoneReady = true) => ({ id, name: id, color: "#22c55e", avatar: "", connected: true, alive: true, ready: true, microphoneReady })
const snapshot = () => ({ roomName: "QA", hostId: "me", hostCanStartSolo: false, players: [player("me"), player("other")], chat: [], config: {}, phase: "lobby" })
const { MicrophoneSetup, MicrophoneToggle } = await isolated("microphone-setup.tsx", ["MicrophoneSetup", "MicrophoneToggle"])
const { Lobby } = await isolated("lobby.tsx", ["Lobby"], { MicrophoneSetup, PlayerBadge: "PlayerBadge", LobbyRules: "LobbyRules" })
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }

check("Permissão é solicitada apenas pelo clique, com erro, nova tentativa e estado ocupado", () => {
  const calls = []
  const voice = { ...voiceDefaults(), configure: (...args) => calls.push(args) }
  const mounted = mount(MicrophoneSetup, { voice, serverReady: false })
  let tree = mounted.render()
  assert.equal(calls.length, 0)
  assert.equal(all(tree, (node) => node.type === "select").length, 0)
  button(tree, "Permitir microfone").props.onClick()
  assert.deepEqual(calls, [[]])
  tree = mounted.render({ voice: { ...voice, busy: true }, serverReady: false })
  assert.equal(button(tree, "Aguardando permissão").props.disabled, true)
  tree = mounted.render({ voice: { ...voice, error: "Permita o microfone no navegador." }, serverReady: false })
  assert.ok(text(all(tree, (node) => node.props.role === "alert")[0]).includes("Permita"))
  button(tree, "Tentar novamente").props.onClick()
  assert.equal(calls.length, 2)
})

check("Seleção usa deviceId real, silêncio preserva configuração e controles respeitam busy", () => {
  const calls = [], toggles = []
  const voice = { ...voiceDefaults(), configured: true, selectedDeviceId: "usb", devices: [{ deviceId: "usb", label: "Headset USB" }, { deviceId: "webcam", label: "Webcam" }],
    configure: (id) => calls.push(id), toggle: () => toggles.push(true) }
  const mounted = mount(MicrophoneSetup, { voice, serverReady: true })
  let tree = mounted.render()
  assert.equal(calls.length, 0)
  const select = all(tree, (node) => node.type === "select")[0]
  assert.equal(select.props.value, "usb")
  select.props.onChange({ target: { value: "webcam" } })
  assert.deepEqual(calls, ["webcam"])
  button(tree, "Ativar microfone").props.onClick()
  assert.equal(toggles.length, 1)
  assert.ok(text(tree).includes("pronto e silenciado"))
  tree = mounted.render({ voice: { ...voice, enabled: true }, serverReady: true })
  assert.ok(button(tree, "Silenciar"))
  tree = mounted.render({ voice: { ...voice, busy: true }, serverReady: true })
  assert.equal(all(tree, (node) => node.type === "select")[0].props.disabled, true)
  assert.equal(button(tree, "Ativar microfone").props.disabled, true)
  tree = mounted.render({ voice: { ...voice, devices: [] }, serverReady: true })
  assert.equal(all(tree, (node) => node.type === "option" && node.props.value === "usb").length, 1, "Entrada atual permanece visível enquanto a lista está indisponível")
})

check("Pronto exige captura local e confirmação do servidor, inclusive quando silenciado", () => {
  for (const [configured, serverReady, busy] of [[false, false, false], [false, true, false], [true, false, false], [true, true, true], [true, true, false]]) {
    const state = snapshot(), sends = []
    state.players[0] = { ...state.players[0], ready: false, microphoneReady: serverReady }
    const voice = { ...voiceDefaults(), configured, busy }
    const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice, onSend: (type) => sends.push(type), onLeave() {} }).render()
    const ready = button(tree, "Estou pronto")
    const allowed = configured && serverReady && !busy
    assert.equal(ready.props.disabled, !allowed)
    ready.props.onClick()
    assert.equal(sends.length, Number(allowed), "Callback também bloqueia a ação não autorizada")
    assert.equal(all(tree, (node) => node.type === MicrophoneSetup)[0].props.voice, voice)
  }
})

check("Desmarcar Pronto continua permitido após perder o microfone ou durante configuração", () => {
  const state = snapshot(), sends = []
  state.players[0].microphoneReady = false
  const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice: { ...voiceDefaults(), busy: true }, onSend: (type) => sends.push(type), onLeave() {} }).render()
  const unready = button(tree, "Não estou pronto")
  assert.equal(unready.props.disabled, false)
  unready.props.onClick()
  assert.deepEqual(sends, ["ready"])
})

check("Anfitrião só inicia com todos os microfones, sem exceção para o próprio host ou admin solo", () => {
  for (const missingId of ["me", "other", null]) {
    const state = snapshot(), sends = []
    if (missingId) state.players.find((entry) => entry.id === missingId).microphoneReady = false
    const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice: { ...voiceDefaults(), configured: true }, onSend: (type) => sends.push(type), onLeave() {} }).render()
    const start = button(tree, "Começar partida")
    assert.equal(start.props.disabled, missingId !== null)
    start.props.onClick()
    assert.equal(sends.length, Number(missingId === null))
  }
  for (const [configured, serverReady, busy] of [[false, false, false], [true, false, false], [true, true, true], [true, true, false]]) {
    const state = snapshot(), sends = []
    state.hostCanStartSolo = true
    state.players = [player("me", serverReady)]
    const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 4, voice: { ...voiceDefaults(), configured, busy }, onSend: (type) => sends.push(type), onLeave() {} }).render()
    const start = button(tree, "Começar partida")
    const allowed = configured && serverReady && !busy
    assert.equal(start.props.disabled, !allowed)
    start.props.onClick()
    assert.equal(sends.length, Number(allowed))
  }
})

check("Desconectados bloqueiam Pronto e início mesmo com confirmação de microfone atrasada", () => {
  for (const disconnected of ["me", "other"]) {
    const state = snapshot(), sends = []
    state.players[0].ready = false
    state.players.find((entry) => entry.id === disconnected).connected = false
    const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice: { ...voiceDefaults(), configured: true }, onSend: (type) => sends.push(type), onLeave() {} }).render()
    const start = button(tree, "Começar partida")
    assert.equal(start.props.disabled, true)
    start.props.onClick()
    assert.equal(sends.length, 0)
    const ready = button(tree, "Estou pronto")
    assert.equal(ready.props.disabled, disconnected === "me")
    ready.props.onClick()
    assert.equal(sends.length, Number(disconnected !== "me"))
    assert.equal(all(tree, (node) => node.type === "PlayerBadge" && node.props.player.id === disconnected)[0].props.hint, "Desconectado")
  }
})

check("Cada jogador mostra seu estado de microfone sem confundir silêncio com falta de configuração", () => {
  const state = snapshot()
  state.players[1].microphoneReady = false
  const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice: { ...voiceDefaults(), configured: true }, onSend() {}, onLeave() {} }).render()
  const badges = all(tree, (node) => node.type === "PlayerBadge")
  assert.ok(text(badges[0].props.footer).includes("Microfone configurado"))
  assert.ok(text(badges[1].props.footer).includes("Microfone não configurado"))
  assert.equal(badges[1].props.hint, "Microfone pendente")
})

const voiceCalls = [], sharedVoice = { ...voiceDefaults(), configured: true }
const { ConnectedRoom } = await isolated("page.tsx", ["ConnectedRoom"], {
  GameScreen: "GameScreen", Match: "Match", Lobby: "Lobby", Spinner: "Spinner",
  useProximityVoice(options) { voiceCalls.push(options); return sharedVoice },
})
check("Uma só instância de voz e pose atravessa lobby, jogo, reunião e carregamento do mapa", () => {
  const room = { roomRef: { current: {} }, me: "me", role: null, allies: [], myTasks: [], notices: [], send() {} }
  const mounted = mount(ConnectedRoom, { room, snapshot: snapshot(), map: {}, lobbyMap: {}, minPlayers: 2, onLeave() {} })
  let pose
  for (const [phase, map, lobbyMap] of [["lobby", {}, {}], ["lobby", {}, null], ["lobby", null, {}], ["jogando", {}, {}],
    ["jogando", null, {}], ["reuniao", {}, {}], ["votacao", {}, {}], ["fim", {}, {}], ["lobby", {}, {}]]) {
    const tree = mounted.render({ room, snapshot: { ...snapshot(), phase }, map, lobbyMap, minPlayers: 2, onLeave() {} })
    const call = voiceCalls.at(-1)
    assert.equal(call.snapshot.phase, phase)
    pose ??= call.poseRef
    assert.equal(call.poseRef, pose, "Pose não remonta entre fases")
    const match = all(tree, (node) => node.type === "Match")[0]
    const activeMap = phase === "lobby" ? lobbyMap : map
    assert.equal(Boolean(match), activeMap !== null)
    if (match) {
      assert.equal(match.props.voice, sharedVoice); assert.equal(match.props.poseRef, pose)
      assert.equal(match.props.map, activeMap, "Lobby nunca usa o mapa da partida como fallback")
      assert.equal(match.props.lobby, phase === "lobby")
    }
    const lobby = all(tree, (node) => node.type === "Lobby")[0]
    assert.equal(Boolean(lobby), phase === "lobby")
    if (lobby) assert.equal(lobby.props.voice, sharedVoice)
  }
})

check("Exploração da página é explícita, depende da sala correta e não remonta a voz entre fases", () => {
  const room = { roomRef: { current: {} }, me: "me", role: null, allies: [], myTasks: [], notices: [], send() {} }
  const map = { id: "office" }, lobbyMap = { id: "lobby" }
  let props = { room, snapshot: snapshot(), map, lobbyMap: null, minPlayers: 2, onLeave() {} }
  const mounted = mount(ConnectedRoom, props)
  let tree = mounted.render()
  const lobby = () => all(tree, (node) => node.type === "Lobby")[0]
  const match = () => all(tree, (node) => node.type === "Match")[0]
  const lobbyLayer = () => all(tree, (node) => node.props.className?.includes("absolute inset-0")
    && all(node, (child) => child.type === "Lobby").length === 1)[0]
  assert.equal(match(), undefined)
  assert.equal(lobby().props.canExplore, false)
  lobby().props.onExploreChange(true); tree = mounted.render()
  assert.equal(lobby().props.exploring, false, "Handler não libera exploração quando o mapa da sala não chegou")
  props = { ...props, lobbyMap }; tree = mounted.render(props)
  const voice = match().props.voice, pose = match().props.poseRef
  assert.equal(match().props.lobbyControlsEnabled, false)
  lobby().props.onExploreChange(true); tree = mounted.render()
  assert.equal(lobby().props.exploring, true)
  assert.equal(match().props.lobbyControlsEnabled, true)
  assert.ok(lobbyLayer().props.className.includes("pointer-events-none"), "Dock não intercepta a área livre do Canvas")
  match().props.onLobbySetup(); tree = mounted.render()
  assert.equal(lobby().props.exploring, false)
  assert.equal(match().props.lobbyControlsEnabled, false)
  assert.ok(!lobbyLayer().props.className.includes("pointer-events-none"), "Preparação completa volta a capturar os cliques")
  lobby().props.onExploreChange(true); tree = mounted.render()
  props = { ...props, snapshot: { ...props.snapshot, phase: "jogando" } }; tree = mounted.render(props)
  assert.equal(lobby(), undefined)
  assert.equal(match().props.map, map)
  assert.equal(match().props.lobby, false)
  assert.equal(match().props.lobbyControlsEnabled, false)
  assert.equal(match().props.voice, voice); assert.equal(match().props.poseRef, pose)
  props = { ...props, snapshot: { ...props.snapshot, phase: "lobby" } }; tree = mounted.render(props)
  assert.equal(lobby().props.exploring, false, "Nova rodada volta para a preparação completa")
  assert.equal(match().props.map, lobbyMap)
  assert.equal(match().props.voice, voice); assert.equal(match().props.poseRef, pose)
})
const pageSource = await readFile(directory + "page.tsx", "utf8")
const matchSource = await readFile(directory + "match.tsx", "utf8")
assert.equal((pageSource.match(/useProximityVoice\(/g) ?? []).length, 1)
assert.ok(!matchSource.includes("useProximityVoice"), "Match não cria uma segunda captura de voz")

const { snapshotOf } = await isolated("use-deducao-room.ts", ["snapshotOf"])
check("Snapshot publica somente microphoneReady e assume false em servidor sem confirmação", () => {
  for (const microphoneReady of [undefined, false, true]) {
    const state = { players: new Map([["me", { ...player("me"), microphoneReady, selectedDeviceId: "private-device", stream: "private-stream" }]]),
      meeting: { voted: new Map(), tally: new Map() }, corpses: new Map(), chat: [], config: {} }
    const next = snapshotOf(state).players[0]
    assert.equal(next.microphoneReady, Boolean(microphoneReady))
    assert.equal(next.selectedDeviceId, undefined)
    assert.equal(next.stream, undefined)
  }
})

const { Meeting, Verdict } = await isolated("meeting.tsx", ["Meeting", "Verdict"], {
  useMeetingCountdown: () => 25, PlayerBadge: "PlayerBadge", Fingerprint: "Fingerprint", SkipForward: "SkipForward", MicrophoneToggle,
})
check("Microfone compacto silencia, reativa e tenta novamente sem captura automática", () => {
  const configured = [], toggled = []
  const voice = { ...voiceDefaults(), configure: (...args) => configured.push(args), toggle: () => toggled.push(true) }
  const mounted = mount(MicrophoneToggle, { voice })
  let tree = mounted.render()
  assert.equal(configured.length, 0)
  button(tree, "Ativar microfone").props.onClick()
  assert.deepEqual(configured, [[]])
  tree = mounted.render({ voice: { ...voice, error: "Microfone desconectado." } })
  assert.ok(all(tree, (node) => node.props.role === "alert").length)
  button(tree, "Tentar microfone novamente").props.onClick()
  assert.equal(configured.length, 2)
  tree = mounted.render({ voice: { ...voice, configured: true, enabled: true } })
  button(tree, "Silenciar microfone").props.onClick()
  tree = mounted.render({ voice: { ...voice, configured: true, enabled: false } })
  assert.ok(button(tree, "Ativar microfone").props.title.includes("continua ouvindo"))
  button(tree, "Ativar microfone").props.onClick()
  assert.equal(toggled.length, 2)
  tree = mounted.render({ voice: { ...voice, configured: true, selectedDeviceId: "usb", error: "Não foi possível trocar." } })
  button(tree, "Tentar novamente").props.onClick()
  assert.equal(configured.at(-1)[0], "usb")
  tree = mounted.render({ voice: { ...voice, busy: true } })
  const busy = button(tree, "Conectando microfone")
  assert.equal(busy.props.disabled, true)
  busy.props.onClick()
  assert.equal(configured.length, 3)
  assert.equal(toggled.length, 2)
})

check("Discussão, votação e veredito exibem a mesma voz por cima da cena", () => {
  const voice = { ...voiceDefaults(), configured: true }
  for (const [phase, voting] of [["reuniao", false], ["votacao", true], ["votacao", false]]) {
    const state = { ...snapshot(), phase, meeting: { voted: [], voting, endsAt: 25_000, reason: "emergencia", calledByName: "me", ejectedId: "", skips: 0 } }
    let tree = mount(Meeting, { snapshot: state, me: "me", role: "funcionario", voice, onSend() {} }).render()
    if (phase === "votacao" && !voting) {
      assert.equal(tree.type, Verdict)
      assert.equal(tree.props.voice, voice)
      tree = mount(Verdict, tree.props).render()
    }
    assert.ok(tree.props.className.includes("z-20"), "Controle pertence ao overlay que cobria o HUD")
    assert.equal(all(tree, (node) => node.type === MicrophoneToggle)[0].props.voice, voice)
  }
  assert.match(matchSource, /<Meeting\s[^>]*voice=\{voice\}/, "Match encaminha a instância existente à reunião")
})

check("Perder o microfone durante reunião não bloqueia votação nem expulsa o jogador", () => {
  for (const busy of [false, true]) {
    const sends = []
    const state = { ...snapshot(), phase: "votacao", meeting: { voted: [], voting: true, endsAt: 25_000, reason: "emergencia", calledByName: "me" } }
    const tree = mount(Meeting, { snapshot: state, me: "me", role: "funcionario", voice: { ...voiceDefaults(), busy, error: "Sem microfone." }, onSend: (...args) => sends.push(args) }).render()
    assert.equal(sends.length, 0)
    all(tree, (node) => node.type === "PlayerBadge" && node.props.player.id === "other")[0].props.onClick()
    assert.equal(sends[0][0], "vote")
    assert.equal(sends[0][1].targetId, "other")
    button(tree, "Pular o voto").props.onClick()
    assert.equal(sends[1][0], "vote")
    assert.equal(sends[1][1].targetId, "")
  }
})

const { EndScreen } = await isolated("end-screen.tsx", ["EndScreen"], {
  PlayerBadge: "PlayerBadge", RotateCcw: "RotateCcw", MicrophoneToggle,
})
check("Resultado mantém o controle de microfone acessível para anfitrião e convidado", () => {
  for (const me of ["me", "other"]) {
    const voice = { ...voiceDefaults(), configured: true, enabled: true }
    const sends = [], leaves = []
    const tree = mount(EndScreen, { snapshot: { ...snapshot(), phase: "fim" }, me, roles: {}, voice,
      onSend: (type) => sends.push(type), onLeave: () => leaves.push(true) }).render()
    assert.ok(tree.props.className.includes("z-30"))
    assert.equal(all(tree, (node) => node.type === MicrophoneToggle)[0].props.voice, voice)
    assert.equal(Boolean(button(tree, "Outra partida")), me === "me")
    if (me === "me") { button(tree, "Outra partida").props.onClick(); assert.deepEqual(sends, ["restart"]) }
    button(tree, "Sair da sala").props.onClick()
    assert.deepEqual(leaves, [true])
  }
  assert.match(matchSource, /<EndScreen\s[^>]*voice=\{voice\}/)
})

check("Explorar a sala não solicita microfone e conserva preparação, voz e rascunho ao voltar", () => {
  const sends = [], configured = [], toggles = [], transitions = []
  const state = snapshot()
  state.players[0].ready = false
  state.players[0].microphoneReady = false
  const voice = { ...voiceDefaults(), configure: () => configured.push(true), toggle: () => toggles.push(true) }
  let props = { snapshot: state, me: "me", minPlayers: 2, voice, onSend: (type) => sends.push(type), onLeave() {},
    onExploreChange(exploring) { transitions.push(exploring); props = { ...props, exploring } } }
  const mounted = mount(Lobby, props)
  let tree = mounted.render()
  const chat = all(tree, (node) => node.type === "input" && node.props.placeholder === "Fala aí")[0]
  chat.props.onChange({ target: { value: "Já volto" } })
  let blurs = 0
  const click = () => ({ currentTarget: { blur() { blurs++ } } })
  const explore = button(tree, "Testar na sala")
  assert.equal(explore.props.disabled, false)
  explore.props.onClick(click())
  assert.deepEqual(transitions, [true])
  tree = mounted.render(props)
  assert.ok("data-lobby-dock" in tree.props)
  assert.match(tree.props.className, /pointer-events-none/)
  assert.match(tree.props.className, /top-/)
  assert.doesNotMatch(tree.props.className, /bottom-/)
  assert.equal(all(tree, (node) => node.type === MicrophoneSetup).length, 0)
  assert.equal(all(tree, (node) => node.type === "LobbyRules").length, 0)
  assert.equal(all(tree, (node) => node.type === "input" || node.type === "select").length, 0)
  assert.equal(button(tree, "Estou pronto").props.disabled, true)
  button(tree, "Estou pronto").props.onClick(click())
  assert.deepEqual(sends, [])
  button(tree, "Preparação").props.onClick(click())
  tree = mounted.render(props)
  assert.deepEqual(transitions, [true, false])
  assert.equal(all(tree, (node) => node.type === MicrophoneSetup)[0].props.voice, voice)
  assert.equal(all(tree, (node) => node.type === "input" && node.props.placeholder === "Fala aí")[0].props.value, "Já volto")
  assert.equal(blurs, 3)
  assert.deepEqual(configured, []); assert.deepEqual(toggles, [])
})

check("Sala indisponível bloqueia Testar sem usar outro mapa nem alterar prontidão", () => {
  const explores = [], sends = []
  const props = { snapshot: snapshot(), me: "me", minPlayers: 2, voice: voiceDefaults(),
    canExplore: false, onExploreChange: (next) => explores.push(next), onSend: (type) => sends.push(type), onLeave() {} }
  const mounted = mount(Lobby, props)
  let tree = mounted.render()
  const waiting = button(tree, "Sala de testes carregando")
  assert.equal(waiting.props.disabled, true)
  waiting.props.onClick({ currentTarget: { blur() {} } })
  assert.deepEqual(explores, []); assert.deepEqual(sends, [])
  tree = mounted.render({ ...props, canExplore: true })
  button(tree, "Testar na sala").props.onClick({ currentTarget: { blur() {} } })
  assert.deepEqual(explores, [true])
})

check("Pronto exige as mesmas confirmações no dock e na preparação completa", () => {
  for (const exploring of [false, true]) {
    for (const [configured, serverReady, busy, connected] of [
      [false, false, false, true], [false, true, false, true], [true, false, false, true],
      [true, true, true, true], [true, true, false, false], [true, true, false, true],
    ]) {
      const state = snapshot(), sends = []
      state.players[0] = { ...state.players[0], ready: false, microphoneReady: serverReady, connected }
      const voice = { ...voiceDefaults(), configured, busy }
      const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice, exploring, onExploreChange() {},
        onSend: (type) => sends.push(type), onLeave() {} }).render()
      const ready = button(tree, "Estou pronto")
      const allowed = configured && serverReady && !busy && connected
      assert.equal(ready.props.disabled, !allowed)
      ready.props.onClick({ currentTarget: { blur() {} } })
      assert.deepEqual(sends, allowed ? ["ready"] : [])
      assert.equal(all(tree, (node) => node.props.id === ready.props["aria-describedby"]).length, 1)
    }
  }
})

check("Dock permite desmarcar Pronto mesmo após perda do microfone ou desconexão", () => {
  for (const busy of [false, true]) {
    for (const connected of [false, true]) {
      const state = snapshot(), sends = []
      state.players[0] = { ...state.players[0], ready: true, microphoneReady: false, connected }
      const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice: { ...voiceDefaults(), busy }, exploring: true,
        onExploreChange() {}, onSend: (type) => sends.push(type), onLeave() {} }).render()
      const unready = button(tree, "Não estou pronto")
      assert.equal(unready.props.disabled, false)
      assert.equal(unready.props["aria-pressed"], true)
      unready.props.onClick({ currentTarget: { blur() {} } })
      assert.deepEqual(sends, ["ready"])
    }
  }
})

check("Início do dock mantém anfitrião, quantidade, conexão e microfones, incluindo modo solo", () => {
  for (const scenario of ["ready", "local-mic", "server-mic", "other-mic", "busy", "local-offline", "other-offline", "not-ready", "missing", "solo", "solo-no-mic"]) {
    const state = snapshot(), sends = []
    const voice = { ...voiceDefaults(), configured: true }
    if (scenario === "local-mic") voice.configured = false
    if (scenario === "server-mic") state.players[0].microphoneReady = false
    if (scenario === "other-mic") state.players[1].microphoneReady = false
    if (scenario === "busy") voice.busy = true
    if (scenario === "local-offline") state.players[0].connected = false
    if (scenario === "other-offline") state.players[1].connected = false
    if (scenario === "not-ready") state.players[1].ready = false
    if (scenario.startsWith("solo")) { state.hostCanStartSolo = true; state.players = [player("me", scenario === "solo")] }
    const minPlayers = scenario === "missing" || scenario.startsWith("solo") ? 4 : 2
    const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers, voice, exploring: true,
      onExploreChange() {}, onSend: (type) => sends.push(type), onLeave() {} }).render()
    const start = button(tree, "Começar partida")
    const allowed = scenario === "ready" || scenario === "solo"
    assert.equal(start.props.disabled, !allowed, scenario)
    start.props.onClick({ currentTarget: { blur() {} } })
    assert.deepEqual(sends, allowed ? ["start"] : [])
  }
  const guest = mount(Lobby, { snapshot: snapshot(), me: "other", minPlayers: 2, voice: { ...voiceDefaults(), configured: true },
    exploring: true, onExploreChange() {}, onSend() {}, onLeave() {} }).render()
  assert.equal(button(guest, "Começar partida"), undefined)
})

check("Ações do dock preservam gesto touch e foco de teclado sem nova captura de voz", () => {
  const state = snapshot(), sends = []
  state.players[0].ready = false
  const tree = mount(Lobby, { snapshot: state, me: "me", minPlayers: 2, voice: { ...voiceDefaults(), configured: true },
    exploring: true, onExploreChange() {}, onSend: (type) => sends.push(type), onLeave() {} }).render()
  for (const label of ["Estou pronto", "Começar partida"]) {
    const action = button(tree, label)
    assert.match(action.props.className, /min-h-11/)
    for (const pointerType of ["touch", "pen", "mouse"]) {
      let prevented = false
      action.props.onPointerDown({ pointerType, preventDefault() { prevented = true } })
      assert.equal(prevented, pointerType !== "mouse")
    }
    let blurred = false
    action.props.onClick({ currentTarget: { blur() { blurred = true } } })
    assert.equal(blurred, true)
  }
  assert.deepEqual(sends, ["ready", "start"])
})

console.log(`${checks} verificações de preparação de microfone e continuidade de UI passaram. Sem captura de áudio real.`)
