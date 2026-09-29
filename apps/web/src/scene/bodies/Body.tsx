import type { Planet } from '@perihelion/orbit';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import {
  BODY_APPEARANCE,
  type BodyId,
  SUN_GLOW_COLOR,
  SUN_LIGHT_INTENSITY,
  radiusAu,
} from './bodyCatalog';
import { bodyPositions } from './bodyPositions';

const SPHERE_SEGMENTS = { width: 48, height: 24 } as const;

/** True radii are sub-pixel from 1 AU; a fixed-size dot keeps every body findable at any zoom. */
const MARKER_SIZE_PX = 3;
const MARKER_VERTEX = new Float32Array(3);

export function Body({ body }: { body: BodyId }) {
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    if (groupRef.current) writeSceneOffset(bodyPositions[body], groupRef.current.position);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <group ref={groupRef} name={`body-${body}`}>
      {body === 'sun' ? <SunSurface /> : <PlanetSurface planet={body} />}
      <BodyMarker color={BODY_APPEARANCE[body].color} />
    </group>
  );
}

function SunSurface() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[radiusAu('sun'), SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height]} />
        <meshBasicMaterial color={SUN_GLOW_COLOR} toneMapped={false} />
      </mesh>
      <pointLight intensity={SUN_LIGHT_INTENSITY} decay={0} />
    </>
  );
}

function PlanetSurface({ planet }: { planet: Planet }) {
  return (
    <mesh>
      <sphereGeometry args={[radiusAu(planet), SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height]} />
      <meshStandardMaterial color={BODY_APPEARANCE[planet].color} roughness={0.9} />
    </mesh>
  );
}

function BodyMarker({ color }: { color: string }) {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[MARKER_VERTEX, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={MARKER_SIZE_PX} sizeAttenuation={false} />
    </points>
  );
}
