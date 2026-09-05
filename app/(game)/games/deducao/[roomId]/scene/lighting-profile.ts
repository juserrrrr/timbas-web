const NORMAL = { sun: 0.46, sky: 0.2, ambient: 0.13, environment: 0.1, exposure: 0.87 } as const
const BLACKOUT = { sun: 0.02, sky: 0.025, ambient: 0.018, environment: 0.008, exposure: 0.84 } as const
const NIGHT_VISION = { sun: 0.28, sky: 0.24, ambient: 0.15, environment: 0.04, exposure: 0.94 } as const

export const FIXTURE_INTENSITY = { ceiling: 6.6, terrace: 20, accent: 4.8, emergency: 16.4, emergencyButton: 9.84 } as const

export function viewerLighting(blackout: boolean, nightVision = false) {
  return blackout ? (nightVision ? NIGHT_VISION : BLACKOUT) : NORMAL
}
