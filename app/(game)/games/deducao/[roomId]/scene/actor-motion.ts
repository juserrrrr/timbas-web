const RESPONSE = 18
const CADENCE = 9
const STRIDE = 0.62

export function createActorMotion() {
  return { phase: 0, weight: 0, velocity: 0, seatedWeight: 0, seatedVelocity: 0, swing: 0, bob: 0 }
}

export function updateActorMotion(motion: ReturnType<typeof createActorMotion>, walking: boolean, seated: boolean, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0) return motion
  const target = walking && !seated ? 1 : 0
  const decay = Math.exp(-RESPONSE * delta)
  const offset = motion.weight - target
  const coefficient = motion.velocity + RESPONSE * offset
  // Integra a passada junto do amortecimento, sem congelar sua fase ao parar.
  const travel = target * delta + offset * (1 - decay) / RESPONSE
    + coefficient * ((1 - decay) / (RESPONSE * RESPONSE) - delta * decay / RESPONSE)
  motion.phase = (motion.phase + CADENCE * Math.max(0, travel)) % (Math.PI * 2)
  motion.weight = target + (offset + coefficient * delta) * decay
  motion.velocity = (motion.velocity - RESPONSE * coefficient * delta) * decay

  const seatedTarget = seated ? 1 : 0
  const seatedOffset = motion.seatedWeight - seatedTarget
  const seatedCoefficient = motion.seatedVelocity + RESPONSE * seatedOffset
  motion.seatedWeight = seatedTarget + (seatedOffset + seatedCoefficient * delta) * decay
  motion.seatedVelocity = (motion.seatedVelocity - RESPONSE * seatedCoefficient * delta) * decay
  const step = Math.sin(motion.phase)
  motion.swing = step * STRIDE * motion.weight
  motion.bob = step * step * STRIDE * motion.weight * 0.07
  return motion
}
