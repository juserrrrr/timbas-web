"use client"

import { useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import type { Quality } from "../match-types"
import { viewerLighting } from "./lighting-profile"

export function ProceduralEnvironment({ quality, blackout, nightVision = false }: {
  quality: Quality; blackout: boolean; nightVision?: boolean
}) {
  const { gl, scene } = useThree()

  useEffect(() => {
    const previous = scene.environment
    const generator = new THREE.PMREMGenerator(gl)
    const environment = new RoomEnvironment()
    const size = quality === "alto" ? 256 : quality === "medio" ? 128 : 64
    const target = generator.fromScene(environment, 0.035, 0.1, 100, { size })
    scene.environment = target.texture
    environment.dispose()
    generator.dispose()

    return () => {
      if (scene.environment === target.texture) scene.environment = previous
      target.dispose()
    }
  }, [gl, quality, scene])

  useFrame((_, delta) => {
    const target = viewerLighting(blackout, nightVision).environment
    scene.environmentIntensity += (target - scene.environmentIntensity) * Math.min(1, delta * 3)
  })

  return null
}

export function CinematicEffects({ blackout }: { blackout: boolean }) {
  const { gl, scene, camera, size } = useThree()
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl)
    const samples = Math.min(4, gl.capabilities.maxSamples)
    composer.renderTarget1.samples = samples
    composer.renderTarget2.samples = samples
    const render = new RenderPass(scene, camera)
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.025, 0.16, 1.08)
    const output = new OutputPass()
    composer.addPass(render)
    composer.addPass(bloom)
    composer.addPass(output)
    return { composer, render, bloom, output }
  }, [camera, gl, scene])

  useEffect(() => {
    pipeline.composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.25))
    pipeline.composer.setSize(size.width, size.height)
  }, [gl, pipeline, size.height, size.width])

  useEffect(() => {
    pipeline.bloom.strength = blackout ? 0.035 : 0.025
    pipeline.bloom.threshold = 1.08
  }, [blackout, pipeline])

  useEffect(() => () => {
    pipeline.render.dispose()
    pipeline.bloom.dispose()
    pipeline.output.dispose()
    pipeline.composer.dispose()
  }, [pipeline])

  useFrame((_, delta) => pipeline.composer.render(delta), 1)
  return null
}
