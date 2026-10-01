import type { Planet } from '@perihelion/orbit';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { cameraRig } from '../camera/cameraRig';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import { BODY_APPEARANCE, type BodyId, radiusAu } from './bodyCatalog';
import { bodyPositions } from './bodyPositions';
import { EarthBody } from './earth/EarthBody';
import { useEarthDayMap } from './earth/earthDayMap';
import { SunBody } from './sun/SunBody';

const SPHERE_SEGMENTS = { width: 48, height: 24 } as const;

/** True radii are sub-pixel from 1 AU; a fixed-size dot keeps every body findable at any zoom. */
const MARKER_SIZE_PX = 3;
const MARKER_VERTEX = new Float32Array(3);
/** three.js hit-tests points within 1 world unit (1 AU here), so markers would steal clicks from empty space. */
const IGNORE_RAYCAST = () => undefined;

export function Body({ body }: { body: BodyId }) {
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    if (groupRef.current) writeSceneOffset(bodyPositions[body], groupRef.current.position);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <group
      ref={groupRef}
      name={`body-${body}`}
      onClick={(event) => {
        event.stopPropagation();
        cameraRig.flyTo({ focus: body });
      }}
    >
      <BodySurface body={body} />
      <BodyMarker color={BODY_APPEARANCE[body].color} />
    </group>
  );
}

function BodySurface({ body }: { body: BodyId }) {
  if (body === 'sun') return <SunBody />;
  if (body === 'earthMoonBarycenter') return <EarthSurface />;
  return <PlanetSurface planet={body} />;
}

/** The plain sphere until the day map has loaded. */
function EarthSurface() {
  const dayMap = useEarthDayMap();
  return dayMap ? <EarthBody dayMap={dayMap} /> : <PlanetSurface planet="earthMoonBarycenter" />;
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
    <points raycast={IGNORE_RAYCAST}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[MARKER_VERTEX, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={MARKER_SIZE_PX} sizeAttenuation={false} />
    </points>
  );
}
