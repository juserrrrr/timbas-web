import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const filename = "app/(game)/games/deducao/[roomId]/scene/actor-motion.ts"
const module = { exports: {} }
vm.runInNewContext(ts.transpileModule(await readFile(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { module, exports: module.exports }, { filename })
const { createActorMotion, updateActorMotion } = module.exports
let checks = 0
function check(name, run) { run(); checks++; console.log(`OK ${name}`) }

function simulate(fps) {
  const motion = createActorMotion()
  const samples = []
  const sequence = [[true, false, 1], [false, false, 0.5], [true, false, 0.5], [false, false, 1],
    [true, false, 0.5], [false, true, 1], [false, false, 1], [true, false, 1], [false, false, 2]]
  for (const [walking, seated, duration] of sequence) {
    for (let frame = 1; frame <= Math.round(fps * duration); frame++) {
      assert.equal(updateActorMotion(motion, walking, seated, 1 / fps), motion, "Frame reutiliza o mesmo estado")
      if (frame % (fps / 30) === 0) samples.push({ ...motion })
    }
  }
  return samples
}

check("Parada, retomada e postura sentada têm a mesma pose em 30, 60 e 120 fps", () => {
  const reference = simulate(120)
  for (const fps of [30, 60]) {
    const samples = simulate(fps)
    assert.equal(samples.length, reference.length)
    samples.forEach((motion, index) => {
      for (const key of Object.keys(motion)) {
        assert.ok(Math.abs(motion[key] - reference[index][key]) < 1e-11,
          `${fps} fps, amostra ${index}, ${key}: ${motion[key]} vs ${reference[index][key]}`)
      }
    })
  }
})

check("Soltar a caminhada preserva a velocidade inicial da pose em todas as fases da passada", () => {
  const delta = 1e-6
  for (let step = 0; step < 48; step++) {
    const phase = step * Math.PI / 24
    const walking = { ...createActorMotion(), phase, weight: 1, swing: Math.sin(phase) * 0.62 }
    const stopping = { ...walking }
    const previous = walking.swing
    updateActorMotion(walking, true, false, delta)
    updateActorMotion(stopping, false, false, delta)
    const walkingVelocity = (walking.swing - previous) / delta
    const stoppingVelocity = (stopping.swing - previous) / delta
    assert.ok(Math.abs(stoppingVelocity - walkingVelocity) < 0.00011, `Fase ${phase}: não pode congelar a passada`)
  }
})

check("Parada prolongada retorna ao idle sem reiniciar a fase nem manter balanço residual", () => {
  const motion = createActorMotion()
  updateActorMotion(motion, true, false, 1)
  const stoppingPhase = motion.phase
  updateActorMotion(motion, false, false, 0.1)
  assert.notEqual(motion.phase, stoppingPhase, "A fase continua enquanto a passada desacelera")
  for (let frame = 0; frame < 600; frame++) updateActorMotion(motion, false, false, 1 / 120)
  assert.ok(motion.weight < 1e-30)
  assert.ok(Math.abs(motion.swing) < 1e-30)
  assert.ok(motion.bob < 1e-30)
  const idlePhase = motion.phase
  updateActorMotion(motion, false, false, 1 / 30)
  assert.equal(motion.phase, idlePhase)
  updateActorMotion(motion, true, false, 1 / 120)
  assert.ok(Math.abs(motion.phase - idlePhase) < 0.001, "Retomada não reinicia ou salta a fase")
})

check("Alternâncias rápidas ficam limitadas sem overshoot, deriva ou valores inválidos", () => {
  const motion = createActorMotion()
  for (let frame = 0; frame < 2400; frame++) {
    updateActorMotion(motion, frame % 5 < 2, frame % 23 < 3, 1 / [30, 60, 120][frame % 3])
    assert.ok(motion.weight >= 0 && motion.weight <= 1)
    assert.ok(motion.seatedWeight >= 0 && motion.seatedWeight <= 1)
    assert.ok(Math.abs(motion.swing) <= 0.62)
    assert.ok(motion.bob >= 0 && motion.bob <= 0.0434)
    for (const value of Object.values(motion)) assert.ok(Number.isFinite(value))
  }
  const before = { ...motion }
  for (const delta of [0, -1, NaN, Infinity]) updateActorMotion(motion, true, true, delta)
  assert.deepEqual({ ...motion }, before)
})

console.log(`${checks} verificações de animação e transição stop/start passaram em 30/60/120 fps.`)
