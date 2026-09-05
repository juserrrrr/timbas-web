"use client"

import { useLayoutEffect, useMemo } from "react"
import { useThree } from "@react-three/fiber"
import type { OfficeMap } from "@/lib/services/games"
import { worldLightSources } from "./office-world"
import { buildLightGrid, officeLightUniforms } from "./light-grid"

export function OfficeLightGrid({ map, blackout }: { map: OfficeMap; blackout: boolean }) {
  const { gl, scene } = useThree()
  const grid = useMemo(() => buildLightGrid(worldLightSources(map)), [map])
  useLayoutEffect(() => {
    const uniforms = officeLightUniforms
    uniforms.uOfficeHeaders.value = grid.headers
    uniforms.uOfficeIndices.value = grid.indices
    uniforms.uOfficeRecords.value = grid.records
    uniforms.uOfficeOrigin.value.copy(grid.origin)
    uniforms.uOfficeDimensions.value.copy(grid.dimensions)
    uniforms.uOfficeCellSize.value = grid.cellSize
    for (const texture of [grid.headers, grid.indices, grid.records]) gl.initTexture(texture)
    scene.userData.officeLightGrid = grid.stats
    return () => {
      if (uniforms.uOfficeRecords.value === grid.records) {
        uniforms.uOfficeDimensions.value.set(0, 0, 0)
        uniforms.uOfficeHeaders.value = null
        uniforms.uOfficeIndices.value = null
        uniforms.uOfficeRecords.value = null
        delete scene.userData.officeLightGrid
      }
      grid.dispose()
    }
  }, [gl, grid, scene])
  useLayoutEffect(() => { officeLightUniforms.uOfficeEmergency.value = blackout ? 1 : 0 }, [blackout])
  return null
}
