import type { Vector3 } from '@perihelion/orbit';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Points } from 'three';
import { BODY_APPEARANCE } from '../bodies/bodyCatalog';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';

export interface MarkerLook {
  name: string;
  color: string;
  sizePx: number;
  /** Skip the depth test: drawn over the body's own disc, even when that disc is dark. */
  overBody?: boolean;
}

/** Drawn after the opaque bodies, so an over-body marker is not painted over by the disc it sits on. */
const OVER_BODY_RENDER_ORDER = 1;
const MARKER_VERTEX = new Float32Array(3);
/** three.js hit-tests points within 1 world unit (1 AU here), so markers would steal clicks from empty space. */
const IGNORE_RAYCAST = () => undefined;

/**
 * Illustrative: from a shot's camera Earth's disc is often under a pixel, and the side facing the camera may be in
 * darkness, so a shot draws Earth a marker over its disc. Each shot names its own.
 */
export function earthMarkerLook(name: string): MarkerLook {
  return { name, color: BODY_APPEARANCE.earthMoonBarycenter.color, sizePx: 8, overBody: true };
}

/** A fixed pixel size keeps the body findable at any zoom. */
export function FixedSizeMarker({
  look,
  positionAu,
}: {
  look: MarkerLook;
  positionAu: Readonly<Vector3>;
}) {
  const markerRef = useRef<Points>(null);
  useFrame(() => {
    if (markerRef.current) writeSceneOffset(positionAu, markerRef.current.position);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <points
      ref={markerRef}
      name={look.name}
      raycast={IGNORE_RAYCAST}
      renderOrder={look.overBody ? OVER_BODY_RENDER_ORDER : 0}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[MARKER_VERTEX, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={look.color}
        size={look.sizePx}
        sizeAttenuation={false}
        depthTest={!look.overBody}
        depthWrite={!look.overBody}
      />
    </points>
  );
}
