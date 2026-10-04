import type { Vector3 } from '@perihelion/orbit';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Points } from 'three';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import { IGNORE_RAYCAST, useDisposal } from '../swarm/swarmLayer';
import type { MarkerLook } from './markerLook';
import { createMarkerMaterial, createMarkerUniforms } from './markerMaterial';

/** Drawn after the opaque bodies, so an over-body marker is not painted over by the disc it sits on. */
const OVER_BODY_RENDER_ORDER = 1;
const MARKER_VERTEX = new Float32Array(3);

/** A fixed pixel size keeps the body findable at any zoom. */
export function FixedSizeMarker({
  look,
  positionAu,
}: {
  look: MarkerLook;
  positionAu: Readonly<Vector3>;
}) {
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const uniforms = useMemo(() => createMarkerUniforms(look, pixelRatio), [look, pixelRatio]);
  const material = useMemo(() => createMarkerMaterial(look, uniforms), [look, uniforms]);
  useDisposal(material);
  const markerRef = useRef<Points>(null);
  useFrame(() => {
    if (markerRef.current) writeSceneOffset(positionAu, markerRef.current.position);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <points
      ref={markerRef}
      name={look.name}
      material={material}
      raycast={IGNORE_RAYCAST}
      renderOrder={look.overBody ? OVER_BODY_RENDER_ORDER : 0}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[MARKER_VERTEX, 3]} />
      </bufferGeometry>
    </points>
  );
}
