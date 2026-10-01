import type { CmeEarthArrival } from '@perihelion/data';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Group, type Mesh, Vector3 } from 'three';
import { jdTdbFromIso } from '../../../eruptions/cmeGeometry';
import { timeStore } from '../../../time/timeStore';
import { radiusAu } from '../../bodies/bodyCatalog';
import { bodyPositions } from '../../bodies/bodyPositions';
import {
  writeEarthRotation,
  writeSunDirectionFromEarth,
} from '../../bodies/earth/earthOrientation';
import { FRAME_PRIORITY } from '../../framePriorities';
import { writeSceneOffset } from '../../sceneFrame';
import { IGNORE_RAYCAST, useDisposal } from '../../swarm/swarmLayer';
import {
  advanceAuroraFlicker,
  createAuroraMaterial,
  createImpactUniforms,
  createMagnetopauseMaterial,
  writeImpactUniforms,
} from './impactMaterials';
import { IMPACT_LOOK } from './impactLook';
import { impactStrength, lerpByLevel } from './impactTiming';
import { createMagnetopauseGeometry } from './magnetopause';

const AURORA_SEGMENTS = { width: 96, height: 48 } as const;
/** The magnetopause model's axis is local +z; it is turned onto the Earth → Sun line each frame. */
const MODEL_SUNWARD = new Vector3(0, 0, 1);

/**
 * Illustrative impact at Earth for a CME with an ENLIL arrival: the magnetopause (Shue et al. 1998) glows and is
 * pushed in, and the auroral ovals light and spread on the night side, following ENLIL's arrival time.
 */
export function EarthImpact({ arrival }: { arrival: CmeEarthArrival }) {
  const timing = useMemo(
    () => ({
      arrivalJdTdb: jdTdbFromIso(arrival.predictedTime),
      strength: impactStrength(arrival),
    }),
    [arrival],
  );
  const uniforms = useMemo(() => createImpactUniforms(), []);
  const magnetopauseGeometry = useMemo(() => createMagnetopauseGeometry(), []);
  const magnetopauseMaterial = useMemo(
    () => createMagnetopauseMaterial(uniforms.magnetopause),
    [uniforms],
  );
  const auroraMaterial = useMemo(() => createAuroraMaterial(uniforms.aurora), [uniforms]);
  useDisposal(magnetopauseGeometry);
  useDisposal(magnetopauseMaterial);
  useDisposal(auroraMaterial);
  const groupRef = useRef<Group>(null);
  const magnetopauseRef = useRef<Mesh>(null);
  const auroraRef = useRef<Mesh>(null);
  useFrame((_, deltaSeconds) => {
    const { jdTdb, playing } = timeStore.state;
    const level = writeImpactUniforms(uniforms, { timing, jdTdb });
    const sunDirection = writeSunDirectionFromEarth(
      bodyPositions.earthMoonBarycenter,
      uniforms.aurora.sunDirection.value,
    );
    if (playing) advanceAuroraFlicker(uniforms.aurora, deltaSeconds);
    if (groupRef.current)
      writeSceneOffset(bodyPositions.earthMoonBarycenter, groupRef.current.position);
    placeMagnetopause(magnetopauseRef.current, { sunDirection, level });
    placeAurora(auroraRef.current, jdTdb);
  }, FRAME_PRIORITY.sceneObjects);
  const earthRadiusAu = radiusAu('earthMoonBarycenter');
  return (
    <group ref={groupRef} name="earth-impact">
      <mesh
        ref={magnetopauseRef}
        name="magnetopause"
        geometry={magnetopauseGeometry}
        material={magnetopauseMaterial}
        raycast={IGNORE_RAYCAST}
      />
      <mesh
        ref={auroraRef}
        name="aurora"
        material={auroraMaterial}
        matrixAutoUpdate={false}
        raycast={IGNORE_RAYCAST}
      >
        <sphereGeometry
          args={[
            earthRadiusAu * IMPACT_LOOK.auroraRadiusRatio,
            AURORA_SEGMENTS.width,
            AURORA_SEGMENTS.height,
          ]}
        />
      </mesh>
    </group>
  );
}

/** Scaled by the standoff (pushed in as the impact grows) and turned so the model's nose faces the Sun. */
function placeMagnetopause(
  mesh: Mesh | null,
  frame: { sunDirection: Vector3; level: number },
): void {
  if (!mesh) return;
  const { quietStandoffEarthRadii, compressedStandoffEarthRadii } = IMPACT_LOOK;
  const standoffAu =
    lerpByLevel(quietStandoffEarthRadii, compressedStandoffEarthRadii, frame.level) *
    radiusAu('earthMoonBarycenter');
  mesh.scale.setScalar(standoffAu);
  mesh.quaternion.setFromUnitVectors(MODEL_SUNWARD, frame.sunDirection);
}

/** The aurora shell turns with Earth, so the ovals stay on the geomagnetic poles. */
function placeAurora(mesh: Mesh | null, jdTdb: number): void {
  if (!mesh) return;
  writeEarthRotation(jdTdb, mesh.matrix);
  mesh.matrixWorldNeedsUpdate = true;
}
