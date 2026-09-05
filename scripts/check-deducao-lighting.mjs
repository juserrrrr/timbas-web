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
const { patchVision } = await isolatedModule("vision-material.tsx", ["SURFACE_CODE", "visionUniforms", "patchVision"])
const { cloneMaterial, ceilingFixturePlacements, emergencyPlacements, normalLightSources, terraceLightSources, isInsideStairOpening, OfficeWorld, WALL_HEIGHT } = await isolatedModule("office-world.tsx", [
  "cloneMaterial", "isInsideStairOpening", "ceilingFixturePlacements", "emergencyPlacements", "normalLightSources", "terraceLightSources", "FixedOfficeLights", "OfficeWorld",
  "WALL_HEIGHT", "STAIR_OPENING_HALF_WIDTH", "STAIR_OPENING_END_PADDING", "EMERGENCY_LIGHT_MODEL",
], {
  FIXTURE_INTENSITY,
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
    const baseline = renderedLights(OfficeWorld({ map, level, blackout }))
    assert.equal(baseline.length, blackout ? emergencies.length + Number((map.emergency.level ?? 0) === level) : lights.length + terraceLights.length)
    if (blackout) {
      baseline.forEach((light, index) => close(light.intensity, index < emergencies.length ? FIXTURE_INTENSITY.emergency : FIXTURE_INTENSITY.emergencyButton, "Emergência segue o perfil compartilhado"))
    }
    for (const quality of ["baixo", "medio", "alto"]) {
      assert.deepEqual(renderedLights(OfficeWorld({ map, level, blackout, quality })), baseline, `${quality}: posições, cores, alcance e intensidades devem coincidir`)
      assert.equal(renderedLights(OfficeWorld({ map, level, blackout, quality, active: false })).length, 0, "Andares inativos não mantêm luzes físicas")
      console.log(`Andar ${level}, ${quality}, ${blackout ? "apagão" : "normal"}: ${baseline.length} fontes iguais ao perfil comum.`)
    }
  }
}

const turn = map.stairs.find((stair) => stair.turnX !== undefined)
assert.ok(isInsideStairOpening(map, 0, turn.turnX + 1, turn.turnZ + 1), "O canto externo do patamar também é um vão no teto")
console.log("Iluminação validada: três qualidades com a mesma energia, dois andares, apagão, visão noturna e shaders no espaço linear.")
