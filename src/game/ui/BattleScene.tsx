import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { BackgroundFixtureLayer, MovingBackgroundLayer } from './battleBackground'
import { RuntimeEntityLayer } from './battleEntities'
import type { BattleSnapshot, CharacterDefinition, StageDefinition } from '../types'

export function BattleScene({
  character,
  stage,
  snapshot,
}: {
  character: CharacterDefinition
  stage: StageDefinition
  snapshot: BattleSnapshot
}) {
  const laneGuideRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!laneGuideRef.current) {
      return
    }

    laneGuideRef.current.rotation.z += delta * 0.9
  })

  return (
    <>
      <color attach="background" args={['#123640']} />
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[7.5, 12]} />
        <meshBasicMaterial color="#163d47" toneMapped={false} />
      </mesh>
      <MovingBackgroundLayer stage={stage} />
      <BackgroundFixtureLayer stage={stage} />
      <mesh ref={laneGuideRef} position={[0, -2.9, 0.2]}>
        <ringGeometry args={[0.48, 0.56, 48]} />
        <meshBasicMaterial color="#5ceee4" toneMapped={false} />
      </mesh>
      <RuntimeEntityLayer character={character} stage={stage} snapshot={snapshot} />
    </>
  )
}
