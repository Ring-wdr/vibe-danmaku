import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'

const batteryAnchor = {
  marginX: 0.82,
  marginY: 0.95,
  z: 1.24,
} as const

const batteryGeometry = {
  width: 0.22,
  capWidth: 0.28,
  segmentHeight: 0.18,
  segmentGap: 0.07,
  framePadding: 0.07,
  depth: 0.035,
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

export function BattleHealthBattery({ hp, maxHp }: { hp: number; maxHp: number }) {
  const { viewport } = useThree()
  const segmentCount = Math.max(1, Math.round(maxHp))
  const activeSegments = Math.max(0, Math.min(Math.round(hp), segmentCount))
  const { bodyHeight, frameHeight } = getBatterySegmentLayout(segmentCount)
  const position = useMemo(
    () =>
      [
        Number((-viewport.width / 2 + batteryAnchor.marginX).toFixed(2)),
        Number((-viewport.height / 2 + batteryAnchor.marginY).toFixed(2)),
        batteryAnchor.z,
      ] as [number, number, number],
    [viewport.height, viewport.width],
  )

  return (
    <group
      name="battle-health-battery"
      position={position}
      userData={{
        testId: 'battle-health-battery',
        hp: activeSegments,
        maxHp: segmentCount,
      }}
    >
      <mesh position={[0, frameHeight / 2 + 0.16, 0]}>
        <boxGeometry args={[0.028, 0.28, 0.018]} />
        <meshBasicMaterial color="#69f0e3" transparent opacity={0.34} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[batteryGeometry.capWidth, frameHeight, batteryGeometry.depth]} />
        <meshBasicMaterial color="#071019" transparent opacity={0.58} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry
          args={[batteryGeometry.capWidth + 0.035, frameHeight + 0.035, 0.012]}
        />
        <meshBasicMaterial color="#b0dcdb" transparent opacity={0.24} toneMapped={false} />
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
            <boxGeometry
              args={[batteryGeometry.width, batteryGeometry.segmentHeight, 0.02]}
            />
            <meshBasicMaterial
              color={isActive ? '#69f0e3' : '#263c40'}
              transparent
              opacity={isActive ? 0.94 : 0.42}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
