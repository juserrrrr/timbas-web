import * as THREE from "three"

export interface OfficeLightSource {
  start: [number, number, number]
  end: [number, number, number]
  color: string
  intensity: number
  range: number
  radius: number
  emergency?: boolean
}

const CELL_SIZE = 2
const TEXTURE_WIDTH = 256
export const MAX_CELL_LIGHTS = 64

function dataTexture(values: number[]) {
  const height = Math.max(1, Math.ceil(values.length / (TEXTURE_WIDTH * 4)))
  const data = new Float32Array(TEXTURE_WIDTH * height * 4)
  data.set(values)
  const texture = new THREE.DataTexture(data, TEXTURE_WIDTH, height, THREE.RGBAFormat, THREE.FloatType)
  texture.needsUpdate = true
  return texture
}

// Índices por volume do mundo, nunca pelo piso ou posição de quem está olhando.
export function buildLightGrid(lights: OfficeLightSource[]) {
  const bounds = new THREE.Box3()
  const sources = lights.map((light) => {
    if (![...light.start, ...light.end, light.intensity, light.range, light.radius].every(Number.isFinite)
      || light.range <= 0 || light.radius <= 0 || light.intensity < 0) throw new Error("Fonte de luz inválida")
    if (light.start.filter((value, axis) => value !== light.end[axis]).length > 1) throw new Error("A fonte linear deve acompanhar um eixo do prédio")
    const box = new THREE.Box3().setFromPoints([new THREE.Vector3(...light.start), new THREE.Vector3(...light.end)])
    bounds.union(box.clone().expandByScalar(light.range))
    return box
  })
  if (bounds.isEmpty()) bounds.set(new THREE.Vector3(), new THREE.Vector3(CELL_SIZE, CELL_SIZE, CELL_SIZE))
  const origin = bounds.min.clone().divideScalar(CELL_SIZE).floor().multiplyScalar(CELL_SIZE)
  const dimensions = bounds.max.clone().sub(origin).divideScalar(CELL_SIZE).ceil().max(new THREE.Vector3(1, 1, 1))
  const cellCount = dimensions.x * dimensions.y * dimensions.z
  const cells: number[][][] = Array.from({ length: cellCount }, () => [[], []])
  for (const [id, source] of sources.entries()) {
    const range = lights[id].range
    const min = source.min.clone().addScalar(-range).sub(origin).divideScalar(CELL_SIZE).floor().max(new THREE.Vector3())
    const max = source.max.clone().addScalar(range).sub(origin).divideScalar(CELL_SIZE).floor().min(dimensions.clone().addScalar(-1))
    for (let z = min.z; z <= max.z; z++) for (let y = min.y; y <= max.y; y++) for (let x = min.x; x <= max.x; x++) {
      let distanceSquared = 0
      for (const [axis, coordinate] of [x, y, z].entries()) {
        const low = origin.getComponent(axis) + coordinate * CELL_SIZE
        const gap = Math.max(source.min.getComponent(axis) - low - CELL_SIZE, low - source.max.getComponent(axis), 0)
        distanceSquared += gap * gap
      }
      if (distanceSquared >= range * range) continue
      cells[x + dimensions.x * (y + dimensions.y * z)][lights[id].emergency ? 1 : 0].push(id)
    }
  }
  const indices: number[] = [], headers: number[] = []
  let maximum = 0, occupied = 0, total = 0
  for (const cell of cells) {
    for (const group of cell) {
      maximum = Math.max(maximum, group.length)
      if (group.length > MAX_CELL_LIGHTS) throw new Error("Densidade de luz acima da capacidade da célula")
      headers.push(indices.length, group.length)
      indices.push(...group)
    }
    if (cell[0].length) { occupied++; total += cell[0].length }
  }
  const records = lights.flatMap((light) => {
    const color = new THREE.Color(light.color).multiplyScalar(light.intensity)
    return [...light.start, light.range, ...light.end, light.radius, color.r, color.g, color.b, 0]
  })
  const textures = { headers: dataTexture(headers), indices: dataTexture(indices), records: dataTexture(records) }
  return {
    ...textures, origin, dimensions, cellSize: CELL_SIZE,
    stats: { sources: lights.length, cells: cellCount, maximum, average: occupied ? total / occupied : 0,
      bytes: Object.values(textures).reduce((sum, texture) => sum + (texture.image.data?.byteLength ?? 0), 0) },
    dispose() { Object.values(textures).forEach((texture) => texture.dispose()) },
  }
}

export const officeLightUniforms = {
  uOfficeHeaders: { value: null as THREE.DataTexture | null },
  uOfficeIndices: { value: null as THREE.DataTexture | null },
  uOfficeRecords: { value: null as THREE.DataTexture | null },
  uOfficeOrigin: { value: new THREE.Vector3() },
  uOfficeDimensions: { value: new THREE.Vector3() },
  uOfficeCellSize: { value: CELL_SIZE },
  uOfficeEmergency: { value: 0 },
}

export const officeLightDeclarations = /* glsl */`
uniform sampler2D uOfficeHeaders;
uniform sampler2D uOfficeIndices;
uniform sampler2D uOfficeRecords;
uniform vec3 uOfficeOrigin;
uniform vec3 uOfficeDimensions;
uniform float uOfficeCellSize;
uniform float uOfficeEmergency;
vec4 officeTexel(sampler2D source, int index) {
  return texelFetch(source, ivec2(index % ${TEXTURE_WIDTH}, index / ${TEXTURE_WIDTH}), 0);
}
`

export const officeLightFragment = /* glsl */`
vec3 officeCell = floor((vVisionPos - uOfficeOrigin) / uOfficeCellSize);
if (all(greaterThanEqual(officeCell, vec3(0.0))) && all(lessThan(officeCell, uOfficeDimensions))) {
  int cellIndex = int(officeCell.x + uOfficeDimensions.x * (officeCell.y + uOfficeDimensions.y * officeCell.z));
  vec4 header = officeTexel(uOfficeHeaders, cellIndex);
  int offset = int(uOfficeEmergency > 0.5 ? header.z : header.x);
  int count = int(uOfficeEmergency > 0.5 ? header.w : header.y);
  for (int i = 0; i < ${MAX_CELL_LIGHTS}; i++) {
    if (i >= count) break;
    int slot = offset + i;
    int id = int(officeTexel(uOfficeIndices, slot / 4)[slot % 4]);
    vec4 a = officeTexel(uOfficeRecords, id * 3);
    vec4 b = officeTexel(uOfficeRecords, id * 3 + 1);
    vec3 axis = b.xyz - a.xyz;
    float lengthSquared = dot(axis, axis);
    float projection = dot(vVisionPos - a.xyz, axis) / max(lengthSquared, 0.00001);
    vec3 toLight = a.xyz + axis * clamp(projection, 0.0, 1.0) - vVisionPos;
    float distanceSquared = dot(toLight, toLight);
    if (distanceSquared >= a.w * a.w) continue;
    float attenuation = 1.0 / max(distanceSquared, b.w * b.w);
    if (lengthSquared > 0.00001) {
      // Aproxima a irradiância de um segmento finito, sem amostrar uma fila de pontos.
      float length = sqrt(lengthSquared);
      float along = projection * length;
      vec3 perpendicular = vVisionPos - (a.xyz + axis * projection);
      float radialSquared = max(dot(perpendicular, perpendicular), b.w * b.w);
      float fromStart = along / sqrt(radialSquared + along * along);
      float toEnd = (length - along) / sqrt(radialSquared + (length - along) * (length - along));
      attenuation = max(0.0, fromStart + toEnd) / (length * sqrt(radialSquared));
    }
    float cutoff = max(1.0 - pow2(distanceSquared / (a.w * a.w)), 0.0);
    directLight.color = officeTexel(uOfficeRecords, id * 3 + 2).rgb * attenuation * cutoff * cutoff;
    directLight.direction = normalize(mat3(viewMatrix) * toLight + vec3(0.0000001));
    directLight.visible = true;
    RE_Direct(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
  }
}
`
