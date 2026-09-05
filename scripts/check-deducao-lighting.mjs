import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"
import * as THREE from "three"

const sceneDirectory = "app/(game)/games/deducao/[roomId]/scene"
async function sourceFile(filename) {
  const path = `${sceneDirectory}/${filename}`
  return ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

async function isolatedModule(filename, names, bindings = {}) {
  const source = await sourceFile(filename)
  const selected = source.statements.filter((statement) =>
    ts.isFunctionDeclaration(statement)
      ? names.includes(statement.name?.text)
      : ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) =>
        ts.isIdentifier(declaration.name) && names.includes(declaration.name.text),
      ),
  )
  assert.equal(selected.length, names.length, `${filename}: todas as declarações reais precisam participar do teste`)
  const printer = ts.createPrinter()
  const isolatedSource = selected.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n")
  const { outputText } = ts.transpileModule(`${isolatedSource}\nmodule.exports = { ${names.join(", ")} };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, { module, exports: module.exports, THREE, ...bindings }, { filename, timeout: 1000 })
  return module.exports
}

const { FIXTURE_INTENSITY, viewerLighting } = await isolatedModule("lighting-profile.ts", [
  "NORMAL", "BLACKOUT", "NIGHT_VISION", "FIXTURE_INTENSITY", "viewerLighting",
])
const gridApi = await isolatedModule("light-grid.ts", ["dataTexture", "buildLightGrid", "CELL_SIZE", "TEXTURE_WIDTH", "MAX_CELL_LIGHTS", "officeLightUniforms", "officeLightDeclarations", "officeLightFragment"])
const { patchVision } = await isolatedModule("vision-material.tsx", ["SURFACE_CODE", "visionUniforms", "patchVision"], gridApi)
const { cloneMaterial, ceilingFixturePlacements, emergencyPlacements, normalLightSources, terraceLightSources, accentLightSources, isInsideStairOpening, OfficeWorld, worldLightSources, WALL_HEIGHT } = await isolatedModule("office-world.tsx", [
  "cloneMaterial", "isInsideStairOpening", "ceilingFixturePlacements", "emergencyPlacements", "normalLightSources", "terraceLightSources", "accentLightSources", "worldLightSources", "OfficeWorld",
  "WALL_HEIGHT", "STAIR_OPENING_HALF_WIDTH", "STAIR_OPENING_END_PADDING", "EMERGENCY_LIGHT_MODEL",
], {
  FIXTURE_INTENSITY,
  FLOOR_HEIGHT: 4.2,
  patchVision,
  useMemo: (factory) => factory(),
  DetailedPropKind: () => null,
  React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
})
const map = JSON.parse(await readFile("assets/models/deducao/office-map.json", "utf8"))
assert.ok(Object.values(FIXTURE_INTENSITY).every((value) => Number.isFinite(value) && value > 0), "Todas as fontes físicas precisam de intensidade positiva")

function renderedLights(node) {
  if (!node) return []
  if (Array.isArray(node)) return Array.from(node).flatMap(renderedLights)
  if (typeof node.type === "function") return renderedLights(node.type(node.props))
  if (node.type === "pointLight") {
    const { children, key, ...light } = node.props
    return [JSON.parse(JSON.stringify(light))]
  }
  return renderedLights(node.props?.children)
}

for (const [blackout, nightVision] of [[false, false], [false, true], [true, false], [true, true]]) {
  const profile = viewerLighting(blackout, nightVision)
  assert.ok(Object.values(profile).every((value) => Number.isFinite(value) && value > 0), "O perfil precisa ter intensidades válidas")
  for (const quality of ["baixo", "medio", "alto"]) {
    assert.deepEqual(viewerLighting(blackout, nightVision, quality), profile, `${quality}: qualidade não muda a luz nem a exposição`)
  }
}
assert.deepEqual(viewerLighting(false, true), viewerLighting(false, false), "Visão noturna só atua durante o apagão")
for (const property of ["sun", "sky", "ambient", "environment", "exposure"]) {
  assert.ok(viewerLighting(true)[property] < viewerLighting(false)[property], `Apagão reduz ${property}`)
  assert.ok(viewerLighting(true, true)[property] > viewerLighting(true)[property], `Visão noturna recupera ${property}`)
}

for (const type of ["standard", "basic"]) {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib[type].vertexShader, fragmentShader: THREE.ShaderLib[type].fragmentShader }
  const material = patchVision(type === "standard" ? new THREE.MeshStandardMaterial() : new THREE.MeshBasicMaterial(), "parede")
  material.onBeforeCompile(shader)
  const toneMapping = shader.fragmentShader.indexOf("#include <tonemapping_fragment>")
  const surface = shader.fragmentShader.indexOf("if (uSurface > 0.5)")
  const blackout = shader.fragmentShader.indexOf("gl_FragColor.rgb *= darkness")
  assert.ok(surface >= 0 && surface < toneMapping, `${type}: textura procedural precisa atuar antes do tone mapping`)
  assert.ok(blackout >= 0 && blackout < toneMapping, `${type}: apagão precisa atuar no mesmo espaço linear com ou sem pós-processamento`)
  assert.ok(!/max\(gl_FragColor\.rgb,\s*vec3\(0\.012\)\)/.test(shader.fragmentShader), "Não pode haver piso de brilho artificial dependente do pipeline")
  material.dispose()
}

const skySource = await sourceFile("night-sky.tsx")
const skyFragment = skySource.statements.filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "FRAGMENT_SHADER")?.initializer
assert.ok(skyFragment && ts.isNoSubstitutionTemplateLiteral(skyFragment), "O shader real do céu precisa participar do teste")
assert.ok(skyFragment.text.indexOf("#include <tonemapping_fragment>") >= 0
  && skyFragment.text.indexOf("#include <tonemapping_fragment>") < skyFragment.text.indexOf("#include <colorspace_fragment>"), "Céu usa tone mapping antes da conversão sRGB em todos os gráficos")
function assertToneMappingEnabled(node) {
  if (ts.isJsxAttribute(node) && node.name.text === "toneMapped" && node.initializer && ts.isJsxExpression(node.initializer)) {
    assert.notEqual(node.initializer.expression?.kind, ts.SyntaxKind.FalseKeyword, "Céu não pode desabilitar o tone mapping apenas no render direto")
  }
  ts.forEachChild(node, assertToneMappingEnabled)
}
assertToneMappingEnabled(skySource)

async function modelBounds(filename) {
  const buffer = await readFile(`public/models/games/deducao/${filename}`)
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString("utf8"))
  const bounds = new THREE.Box3()
  function visit(index, parentMatrix) {
    const node = gltf.nodes[index]
    const matrix = node.matrix
      ? new THREE.Matrix4().fromArray(node.matrix)
      : new THREE.Matrix4().compose(
        new THREE.Vector3(...(node.translation ?? [0, 0, 0])),
        new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
        new THREE.Vector3(...(node.scale ?? [1, 1, 1])),
      )
    matrix.premultiply(parentMatrix)
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        const position = gltf.accessors[primitive.attributes.POSITION]
        bounds.union(new THREE.Box3(new THREE.Vector3(...position.min), new THREE.Vector3(...position.max)).applyMatrix4(matrix))
      }
    }
    for (const child of node.children ?? []) visit(child, matrix)
  }
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, new THREE.Matrix4())
  return bounds
}

const ceilingBounds = await modelBounds("ceiling-light.glb")
const emergencyBounds = await modelBounds("emergency-light.glb")
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.0001, `${message}: ${actual} != ${expected}`)

for (const [name, expected] of [["Warm diffuser", 0.07], ["Exterior · warm residential windows", 2]]) {
  const source = new THREE.MeshStandardMaterial({ emissiveIntensity: 2 })
  source.name = name
  const cloned = cloneMaterial(source, true)
  close(cloned.emissiveIntensity, expected, "Blackout desliga o escritório, não as casas vizinhas")
  source.dispose()
  cloned.dispose()
}

for (const level of [0, 1]) {
  const fixtures = ceilingFixturePlacements(map, level)
  const emergencies = emergencyPlacements(map, level)
  assert.equal(fixtures.length, level === 0 ? 21 : 17, `Quantidade de luminárias físicas no andar ${level}`)
  assert.equal(emergencies.length, level === 0 ? 6 : 4, `Quantidade de luminárias de emergência no andar ${level}`)
  if (level === 0) {
    const service = map.rooms.find((room) => room.id === "corredor-servico").rect
    const insideService = (light) => light.x > service.x && light.x < service.x + service.w && light.z > service.z && light.z < service.z + service.d
    assert.equal(fixtures.filter(insideService).length, 1, "Acesso independente ao depósito tem luminária própria")
    assert.equal(emergencies.filter(insideService).length, 2, "Corredor de serviço mantém luz de emergência no apagão")
  }
  for (const fixture of fixtures) {
    close(fixture.y + ceilingBounds.max.y, WALL_HEIGHT, "A base da luminária deve encostar no teto")
    assert.ok(!isInsideStairOpening(map, level, fixture.x, fixture.z), "Não pode haver luminária dentro do vão da escada")
  }
  for (const emergency of emergencies) {
    close(emergency.y + emergencyBounds.max.y, WALL_HEIGHT, "A emergência deve encostar no teto")
    assert.ok(fixtures.every((fixture) => Math.hypot(fixture.x - emergency.x, fixture.z - emergency.z) > 1.2), "Emergência não pode sobrepor uma luminária normal")
    const corridor = map.rooms.find((room) => (room.level ?? 0) === level && room.kind === "corredor"
      && emergency.x > room.rect.x && emergency.x < room.rect.x + room.rect.w
      && emergency.z > room.rect.z && emergency.z < room.rect.z + room.rect.d)
    assert.ok(corridor, "Emergência deve estar fixada no teto de um corredor")
  }
  const lights = normalLightSources(fixtures)
  assert.equal(lights.length, fixtures.length, "Uma luz por luminária, sem descartar salas")
  for (const [index, light] of lights.entries()) {
    const fixture = fixtures[index]
    close(light.x, fixture.x, "Luz fixa no X da sua luminária")
    close(light.z, fixture.z, "Luz fixa no Z da sua luminária")
    close(light.y, fixture.y - 0.2, "Luz imediatamente abaixo do difusor")
    close(light.intensity, FIXTURE_INTENSITY.ceiling, "Luminárias compartilham a mesma intensidade")
    assert.ok(light.distance >= 7.2 && light.distance <= 9.6)
  }
  const terraceLights = terraceLightSources(map, level)
  const accentLights = accentLightSources(map, level)
  assert.equal(accentLights.length, 3, "Cada piso tem duas fitas azuis e uma amarela iluminando a parede")
  assert.equal(accentLights.filter((light) => light.color === "#38bfff").length, 2)
  assert.equal(accentLights.filter((light) => light.color === "#ffbd45").length, 1)
  const hall = map.rooms.find((room) => room.id === (level === 0 ? "hall-central" : "hall-superior"))
  for (const light of accentLights) {
    const inward = light.color === "#38bfff" ? 1 : -1
    const wallX = hall.rect.x + (inward === -1 ? hall.rect.w : 0)
    close(light.x, wallX + inward * 0.34, "Luz colorida fica diante do difusor fixado na parede")
    close(light.y, 1.75, "Luz colorida segue o centro vertical da fita")
    assert.ok(light.distance <= 3.2, "Cor localizada, sem pintar o cômodo inteiro")
  }
  assert.equal(terraceLights.length, level === 1 ? 2 : 0, "As duas fitas do pergolado devem iluminar")
  if (terraceLights.length) {
    const terrace = map.rooms.find((room) => room.kind === "terraco")
    close((terraceLights[0].x + terraceLights[1].x) / 2, terrace.rect.x + terrace.rect.w / 2, "Fitas simétricas nas vigas laterais")
    close(terraceLights[0].z, terraceLights[1].z, "Fitas alinhadas ao centro das vigas")
    for (const [index, side] of [0.140625, 0.859375].entries()) {
      close(terraceLights[index].x, terrace.rect.x + terrace.rect.w * side, "Luz diretamente sob a fita fixada na face inferior da viga")
    }
    assert.ok(terraceLights.every((light) => light.y === 2.49 && light.intensity === FIXTURE_INTENSITY.terrace))
  }
  for (const blackout of [false, true]) {
    const baseline = worldLightSources(map).filter((light) => Math.floor((light.start[1] + light.end[1]) / 2 / 4.2) === level)
    const normalCount = lights.length + terraceLights.length + accentLights.length
    const emergencyCount = emergencies.length + Number((map.emergency.level ?? 0) === level)
    assert.equal(baseline.length, normalCount + emergencyCount, "Normal e emergência permanecem na grade de luz")
    const illuminated = baseline.filter((light) => light.emergency === blackout)
    assert.equal(illuminated.length, blackout ? emergencyCount : normalCount)
    assert.equal(renderedLights(OfficeWorld({ map, level, blackout })).length, 0, "Não usa 57 pointLights globais para iluminar cada pixel")
    if (blackout) {
      illuminated.forEach((light, index) => close(light.intensity, index < emergencies.length ? FIXTURE_INTENSITY.emergency : FIXTURE_INTENSITY.emergencyButton, "Emergência segue o perfil compartilhado"))
    }
    for (const quality of ["baixo", "medio", "alto"]) {
      assert.deepEqual(worldLightSources(map, quality, blackout, level), worldLightSources(map), `${quality}: fontes não dependem da qualidade, apagão ou andar do observador`)
      console.log(`Andar ${level}, ${quality}, ${blackout ? "apagão" : "normal"}: ${illuminated.length} fontes acesas, ${baseline.length} fontes persistentes.`)
    }
  }
}

const worldGrid = gridApi.buildLightGrid(worldLightSources(map))
assert.equal(worldGrid.stats.sources, 57)
assert.ok(worldGrid.stats.maximum < 32, "Toda célula tem menos fontes do que a antiga lista global")
assert.ok(worldGrid.stats.average < 10, "Custo médio espacial é muito menor que 57 fontes por fragmento")
assert.equal(worldLightSources(map).filter((light) => light.start.some((value, index) => value !== light.end[index])).length, 56, "Barras, teto e emergências são lineares; só o botão usa fonte pontual")
console.log("Grade real:", worldGrid.stats)
worldGrid.dispose()

const turn = map.stairs.find((stair) => stair.turnX !== undefined)
assert.ok(isInsideStairOpening(map, 0, turn.turnX + 1, turn.turnZ + 1), "O canto externo do patamar também é um vão no teto")

function hookHarness() {
  const slots = []
  let cursor = 0, pending = []
  const changed = (previous, next) => !previous || next.some((value, index) => value !== previous[index])
  const useMemo = (factory, dependencies) => {
    const index = cursor++
    if (!slots[index] || changed(slots[index].dependencies, dependencies)) slots[index] = { dependencies, value: factory() }
    return slots[index].value
  }
  const effect = (run, dependencies) => {
    const index = cursor++
    if (!slots[index] || changed(slots[index].dependencies, dependencies)) {
      pending.push(() => { slots[index]?.cleanup?.(); slots[index] = { dependencies, cleanup: run() } })
    }
  }
  return {
    useMemo, useEffect: effect, useLayoutEffect: effect,
    render(component, props) {
      cursor = 0; pending = []
      const tree = component(props)
      pending.forEach((run) => run())
      return tree
    },
    dispose() { slots.forEach((slot) => slot.cleanup?.()) },
  }
}
const lifecycle = hookHarness()
const warm = new THREE.MeshStandardMaterial({ emissive: "#fff1dc", emissiveIntensity: 2 })
warm.name = "Warm diffuser"
const exterior = warm.clone()
exterior.name = "Exterior windows"
const geometry = new THREE.BoxGeometry()
const source = new THREE.Group()
for (const material of [warm, warm, exterior]) source.add(new THREE.Mesh(geometry, material))
const { OfficeBuilding } = await isolatedModule("office-world.tsx", ["cloneMaterial", "OfficeBuilding", "BUILDING_MODEL"], {
  ...lifecycle, patchVision, useGLTF: () => ({ scene: source }),
  React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
})
const initial = lifecycle.render(OfficeBuilding, { blackout: false, quality: "alto" }).props.object
const materials = initial.children.map((mesh) => mesh.material)
assert.equal(materials[0], materials[1], "Meshes que compartilham material não precisam de clones duplicados")
let disposed = 0
new Set(materials).forEach((material) => material.addEventListener("dispose", () => disposed++))
for (let index = 0; index < 120; index++) {
  const blackout = index % 2 === 0
  const tree = lifecycle.render(OfficeBuilding, { blackout, quality: ["baixo", "medio", "alto"][index % 3] }).props.object
  assert.equal(tree, initial, "Apagão/qualidade não recriam o prédio")
  tree.children.forEach((mesh, part) => {
    assert.equal(mesh.material, materials[part], "Mesmo material antes e depois do apagão")
    assert.equal(mesh.geometry, geometry, "Geometria preservada")
    assert.equal(mesh.material.version, 0, "Apagão não pede recompilação de material")
  })
  close(materials[0].emissiveIntensity, blackout ? 0.07 : 2, "Emissão atualiza no material existente")
  close(materials[2].emissiveIntensity, 2, "Janelas externas não apagam")
}
assert.equal(disposed, 0, "Alternância não descarta materiais em uso")
close(warm.emissiveIntensity, 2, "Fonte compartilhada GLTF não é alterada")
lifecycle.dispose()
assert.equal(disposed, 2, "Cada cópia é descartada uma única vez ao sair da cena")

const fixtureHooks = hookHarness()
const DetailedPartInstances = () => null
const { DetailedPropKind } = await isolatedModule("office-world.tsx", ["DetailedPropKind"], {
  ...fixtureHooks, patchVision, DetailedPartInstances, useGLTF: () => ({ scene: source }),
  React: { Fragment: "fragment", createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
})
const model = { path: "fixture.glb" }, transforms = [{ x: 2, y: 3.9445, z: 4, rot: 0 }]
const fixtureTree = fixtureHooks.render(DetailedPropKind, { kind: "emergencyLight", model, transforms, emissiveScale: 0 })
const fixtureParts = fixtureTree.props.children[0].map((node) => node.props.part)
for (let index = 0; index < 120; index++) {
  const emissiveScale = index % 2
  const nodes = fixtureHooks.render(DetailedPropKind, { kind: "emergencyLight", model, transforms, emissiveScale }).props.children[0]
  nodes.forEach((node, part) => {
    assert.equal(node.props.part, fixtureParts[part], "Emergência não recria material nem matriz no apagão")
    close(node.props.part.material.emissiveIntensity, 2 * emissiveScale, "Difusor responde sem trocar de material")
  })
}
fixtureHooks.dispose()
warm.dispose(); exterior.dispose(); geometry.dispose()

const scene = await sourceFile("office-scene.tsx")
function stableSceneNodes(node) {
  if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))) {
    const tag = node.tagName.getText(scene)
    const attributes = node.attributes.properties.filter(ts.isJsxAttribute).map((attribute) => attribute.name.text)
    if (tag === "OfficeWorld") assert.ok(!attributes.includes("active"), "Piso do jogador não ativa/desativa outra parte do mundo")
    if (tag === "spotLight") assert.ok(!attributes.includes("visible"), "Lanterna fica no shader mesmo quando apagada")
  }
  ts.forEachChild(node, stableSceneNodes)
}
stableSceneNodes(scene)
const { prepareScene } = await isolatedModule("scene-warmup.ts", ["prepareScene"])
const nameTexture = new THREE.Texture()
const hiddenName = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTexture }))
hiddenName.visible = false
const warmupScene = new THREE.Scene()
warmupScene.add(hiddenName, new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTexture })))
let compiled = 0
const uploaded = []
let geometryTarget = null, preparedGeometry = 0
await prepareScene({
  getRenderTarget: () => geometryTarget,
  setRenderTarget(target) { geometryTarget = target },
  async compileAsync(scene, camera) { assert.equal(scene, warmupScene); assert.ok(camera instanceof THREE.Camera); compiled++ },
  initTexture(texture) { assert.equal(compiled, 1); uploaded.push(texture) },
  render(scene) {
    assert.equal(geometryTarget.width, 1, "Buffers são enviados fora da tela")
    assert.ok(scene.children.every((child) => !child.frustumCulled))
    assert.equal(hiddenName.visible, false, "Geometria oculta nunca é revelada")
    preparedGeometry++
  },
}, warmupScene, new THREE.PerspectiveCamera())
assert.equal(preparedGeometry, 1)
assert.equal(geometryTarget, null)
assert.equal(hiddenName.frustumCulled, true, "Culling normal é restaurado após preparação")
assert.deepEqual(uploaded, [nameTexture], "Texturas inclusive fora da câmera são preparadas uma única vez antes de jogar")
assert.equal(hiddenName.visible, false, "Pré-compilação não revela jogadores ou etiquetas ocultos")
const previousTarget = new THREE.WebGLRenderTarget(2, 2)
let activeTarget = previousTarget, disposedTarget = 0, finishCompilation
const controller = new AbortController()
const warming = prepareScene({
  getRenderTarget: () => activeTarget,
  setRenderTarget(target) { activeTarget = target },
  compileAsync() {
    assert.notEqual(activeTarget, previousTarget, "Alta compila com destino de pós-processamento")
    activeTarget.addEventListener("dispose", () => disposedTarget++)
    return new Promise((resolve) => { finishCompilation = resolve })
  },
  initTexture() { assert.fail("Cena cancelada não envia texturas ao renderer descartado") },
}, warmupScene, new THREE.PerspectiveCamera(), true, controller.signal)
assert.equal(activeTarget, previousTarget, "Destino é restaurado antes de aguardar a compilação")
controller.abort()
finishCompilation(warmupScene)
await warming
assert.equal(disposedTarget, 1, "Destino temporário é descartado mesmo ao cancelar")
await assert.rejects(prepareScene({
  getRenderTarget: () => previousTarget,
  setRenderTarget(target) { activeTarget = target },
  compileAsync() {
    activeTarget.addEventListener("dispose", () => disposedTarget++)
    throw new Error("warmup-test")
  },
}, warmupScene, new THREE.PerspectiveCamera(), true), /warmup-test/)
assert.equal(activeTarget, previousTarget, "Erro síncrono também restaura o destino")
assert.equal(disposedTarget, 2, "Erro não vaza destino temporário")
await prepareScene({ compileAsync() { assert.fail("Cancelamento anterior evita qualquer preparação") } }, warmupScene, new THREE.PerspectiveCamera(), false, controller.signal)
const renderFailureScene = new THREE.Scene()
const renderFailureGeometry = new THREE.BoxGeometry()
const renderFailureMaterial = new THREE.MeshBasicMaterial()
const initiallyCulled = new THREE.Mesh(renderFailureGeometry, renderFailureMaterial)
const initiallyUnculled = new THREE.Mesh(renderFailureGeometry, renderFailureMaterial)
initiallyUnculled.frustumCulled = false
initiallyUnculled.visible = false
renderFailureScene.add(initiallyCulled, initiallyUnculled)
for (const postprocessing of [false, true]) {
  let renderTarget = previousTarget, renderDisposed = 0, attemptedRender = 0
  await assert.rejects(prepareScene({
    getRenderTarget: () => renderTarget,
    setRenderTarget(target) { renderTarget = target },
    async compileAsync() { return renderFailureScene },
    initTexture() { assert.fail("Malhas deste cenário não possuem texturas para enviar") },
    render(scene) {
      attemptedRender++
      assert.equal(scene, renderFailureScene)
      assert.equal(renderTarget.width, 1, "Render que falha também usa o destino temporário")
      assert.equal(renderTarget.height, 1)
      renderTarget.addEventListener("dispose", () => renderDisposed++)
      assert.equal(initiallyCulled.frustumCulled, false)
      assert.equal(initiallyUnculled.frustumCulled, false)
      assert.equal(initiallyCulled.visible, true)
      assert.equal(initiallyUnculled.visible, false, "Render de preparação não revela malhas ocultas")
      throw new Error("warmup-render-failure")
    },
  }, renderFailureScene, new THREE.PerspectiveCamera(), postprocessing), /warmup-render-failure/)
  assert.equal(attemptedRender, 1)
  assert.equal(renderTarget, previousTarget, "Falha do render restaura o destino anterior")
  assert.equal(initiallyCulled.frustumCulled, true, "Culling habilitado é restaurado após falha")
  assert.equal(initiallyUnculled.frustumCulled, false, "Culling originalmente desabilitado não é alterado")
  assert.equal(initiallyCulled.visible, true)
  assert.equal(initiallyUnculled.visible, false, "Visibilidade oculta permanece intacta após falha")
  assert.equal(renderDisposed, 1, "Falha descarta o destino temporário exatamente uma vez")
}
renderFailureGeometry.dispose()
renderFailureMaterial.dispose()
previousTarget.dispose()
nameTexture.dispose()
warmupScene.children.forEach((child) => child.material.dispose())
console.log("Ciclo de vida validado: 240 alternâncias sem recriar prédio, materiais ou instâncias de emergência.")
console.log("Warmup validado: falha do render direto/pós-processado restaura destino, culling, visibilidade e descarta o temporário uma única vez.")
console.log("Iluminação validada: três qualidades com a mesma energia, dois andares, apagão, visão noturna e shaders no espaço linear.")
