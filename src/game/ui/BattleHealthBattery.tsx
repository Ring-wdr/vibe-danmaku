import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const batteryAnchor = {
  marginX: 0.82,
  marginY: 1.08,
  z: 1.24,
} as const

const batteryGeometry = {
  width: 0.24,
  frameWidth: 0.32,
  segmentHeight: 0.17,
  segmentGap: 0.065,
  framePadding: 0.075,
  segmentSlant: 0.055,
  frameSlant: 0.075,
  segmentRadius: 0.062,
  frameRadius: 0.07,
  depth: 0.022,
} as const

const batteryStyle = {
  cyan: '#69f0e3',
  dimCyan: '#174d52',
} as const

function getBatterySegmentLayout(segmentCount: number) {
  const bodyHeight =
    segmentCount * batteryGeometry.segmentHeight +
    Math.max(0, segmentCount - 1) * batteryGeometry.segmentGap
  const frameHeight = bodyHeight + batteryGeometry.framePadding * 2

  return {
    bodyHeight,
    frameHeight,
  }
}

function createNeonGlowTexture() {
  const width = 64
  const height = 192
  const data = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const xRatio = Math.abs((x / (width - 1)) * 2 - 1)
      const yRatio = Math.abs((y / (height - 1)) * 2 - 1)
      const falloff = Math.max(0, 1 - Math.hypot(xRatio * 0.92, yRatio * 0.54))
      const alpha = Math.round(255 * Math.pow(falloff, 1.85))
      const offset = (y * width + x) * 4

      data[offset] = 105
      data[offset + 1] = 240
      data[offset + 2] = 227
      data[offset + 3] = alpha
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.needsUpdate = true
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  return texture
}

function createSlantedShape(width: number, height: number, slant: number, radius: number) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const cornerRadius = Math.min(radius, width * 0.28, height * 0.34)
  const shape = new THREE.Shape()
  const bottomLeft = { x: -halfWidth + slant, y: -halfHeight }
  const bottomRight = { x: halfWidth + slant, y: -halfHeight }
  const topRight = { x: halfWidth - slant, y: halfHeight }
  const topLeft = { x: -halfWidth - slant, y: halfHeight }

  shape.moveTo(bottomLeft.x + cornerRadius, bottomLeft.y)
  shape.lineTo(bottomRight.x - cornerRadius, bottomRight.y)
  shape.quadraticCurveTo(
    bottomRight.x,
    bottomRight.y,
    bottomRight.x - cornerRadius * 0.26,
    bottomRight.y + cornerRadius,
  )
  shape.lineTo(topRight.x + cornerRadius * 0.26, topRight.y - cornerRadius)
  shape.quadraticCurveTo(topRight.x, topRight.y, topRight.x - cornerRadius, topRight.y)
  shape.lineTo(topLeft.x + cornerRadius, topLeft.y)
  shape.quadraticCurveTo(
    topLeft.x,
    topLeft.y,
    topLeft.x + cornerRadius * 0.26,
    topLeft.y - cornerRadius,
  )
  shape.lineTo(bottomLeft.x - cornerRadius * 0.26, bottomLeft.y + cornerRadius)
  shape.quadraticCurveTo(bottomLeft.x, bottomLeft.y, bottomLeft.x + cornerRadius, bottomLeft.y)

  return shape
}

export function BattleHealthBattery({ hp, maxHp }: { hp: number; maxHp: number }) {
  const { viewport } = useThree()
  const segmentCount = Math.max(1, Math.round(maxHp))
  const activeSegments = Math.max(0, Math.min(Math.round(hp), segmentCount))
  const { bodyHeight, frameHeight } = getBatterySegmentLayout(segmentCount)
  const frameShape = useMemo(
    () =>
      createSlantedShape(
        batteryGeometry.frameWidth,
        frameHeight,
        batteryGeometry.frameSlant,
        batteryGeometry.frameRadius,
      ),
    [frameHeight],
  )
  const segmentShape = useMemo(
    () =>
      createSlantedShape(
        batteryGeometry.width,
        batteryGeometry.segmentHeight,
        batteryGeometry.segmentSlant,
        batteryGeometry.segmentRadius,
      ),
    [],
  )
  const glowTexture = useMemo(createNeonGlowTexture, [])
  const position = useMemo(
    () =>
      [
        Number((-viewport.width / 2 + batteryAnchor.marginX).toFixed(2)),
        Number((-viewport.height / 2 + batteryAnchor.marginY).toFixed(2)),
        batteryAnchor.z,
      ] as [number, number, number],
    [viewport.height, viewport.width],
  )
  const glowHeight = frameHeight + 0.16

  return (
    <group
      name="battle-health-battery"
      position={position}
      rotation={[0, 0, -0.16]}
      userData={{
        testId: 'battle-health-battery',
        hp: activeSegments,
        maxHp: segmentCount,
      }}
    >
      {[0.56, 0.82, 1.12, 1.54].map((scale, index) => (
        <mesh
          key={scale}
          name="battle-health-battery-gradient-blur"
          position={[0, 0, -0.045 - index * 0.006]}
          scale={[scale, 1 + index * 0.22, 1]}
        >
          <planeGeometry args={[batteryGeometry.frameWidth + 0.22, glowHeight]} />
          <meshBasicMaterial
            color={batteryStyle.cyan}
            map={glowTexture}
            transparent
            opacity={[0.26, 0.16, 0.085, 0.04][index]}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.016]}>
        <shapeGeometry args={[frameShape]} />
        <meshBasicMaterial
          color={batteryStyle.dimCyan}
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <shapeGeometry args={[frameShape]} />
        <meshBasicMaterial
          color={batteryStyle.cyan}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: segmentCount }, (_, index) => {
        const isActive = index < activeSegments
        const y =
          -bodyHeight / 2 +
          batteryGeometry.segmentHeight / 2 +
          index * (batteryGeometry.segmentHeight + batteryGeometry.segmentGap)

        return (
          <mesh
            key={index}
            name={
              isActive
                ? 'battle-health-battery-segment-active'
                : 'battle-health-battery-segment-empty'
            }
            position={[0, y, 0.02]}
            userData={{
              testId: 'battle-health-battery-segment',
              active: isActive,
            }}
          >
            <shapeGeometry args={[segmentShape]} />
            <meshBasicMaterial
              color={isActive ? batteryStyle.cyan : batteryStyle.dimCyan}
              transparent
              opacity={isActive ? 0.96 : 0.22}
              blending={isActive ? THREE.AdditiveBlending : THREE.NormalBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
