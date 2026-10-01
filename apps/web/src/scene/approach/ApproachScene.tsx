import type { CloseApproach } from '@perihelion/data';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  type Group,
  Line,
  LineBasicMaterial,
  type Points,
} from 'three';
import { useSelectedApproach } from '../../approaches/approachSelection';
import { timeStore } from '../../time/timeStore';
import { bodyPositions } from '../bodies/bodyPositions';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import { trailForApproach, trailIndexAt } from './approachTrail';
import { asteroidPositionAu, updateAsteroidPosition } from './asteroidPosition';

const APPROACH_COLOR = '#ffb347';
/** Illustrative: the real body is metres to kilometres across, sub-pixel at any useful zoom. */
const MARKER_SIZE_PX = 6;
const MARKER_VERTEX = new Float32Array(3);
const TRAIL_OPACITY = { faint: 0.2, bright: 0.85 } as const;
/** three.js hit-tests points and lines within 1 world unit (1 AU here), so they would steal clicks from empty space. */
const IGNORE_RAYCAST = () => undefined;

interface TrailLines {
  faint: Line;
  bright: Line;
  halfWindowDays: number;
}

/** Mounts only while an approach is selected; everything per frame reads the time store, never React state. */
export function ApproachScene() {
  const selected = useSelectedApproach();
  return selected ? <SelectedApproach approach={selected} /> : null;
}

/** Mounted after `SolarSystem`, so its position update runs after `BodyPositionsUpdater` at the same priority. */
function SelectedApproach({ approach }: { approach: CloseApproach }) {
  useFrame(
    () => updateAsteroidPosition(approach, timeStore.state.jdTdb),
    FRAME_PRIORITY.bodyPositions,
  );
  return (
    <>
      <AsteroidMarker />
      <ApproachTrail approach={approach} />
    </>
  );
}

function AsteroidMarker() {
  const markerRef = useRef<Points>(null);
  useFrame(() => {
    if (markerRef.current) writeSceneOffset(asteroidPositionAu, markerRef.current.position);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <points ref={markerRef} name="approach-marker" raycast={IGNORE_RAYCAST}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[MARKER_VERTEX, 3]} />
      </bufferGeometry>
      <pointsMaterial color={APPROACH_COLOR} size={MARKER_SIZE_PX} sizeAttenuation={false} />
    </points>
  );
}

/**
 * The trail is geocentric, so it is anchored at the Earth–Moon barycentre each frame; the bright copy is drawn up
 * to the sample nearest now, so it ends at the marker.
 */
function ApproachTrail({ approach }: { approach: CloseApproach }) {
  const trail = useTrailLines(approach);
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    writeSceneOffset(bodyPositions.earthMoonBarycenter, groupRef.current.position);
    const offsetDays = timeStore.state.jdTdb - approach.approachJdTdb;
    trail.bright.geometry.setDrawRange(0, trailIndexAt(offsetDays, trail.halfWindowDays) + 1);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <group ref={groupRef} name="approach-trail">
      <primitive object={trail.faint} />
      <primitive object={trail.bright} />
    </group>
  );
}

/** Built once per selection: the path depends on the orbit, not the clock. */
function useTrailLines(approach: CloseApproach): TrailLines {
  const trail = useMemo(() => buildTrailLines(approach), [approach]);
  useEffect(() => () => disposeTrailLines(trail), [trail]);
  return trail;
}

function buildTrailLines(approach: CloseApproach): TrailLines {
  const { positions, halfWindowDays } = trailForApproach(approach);
  // One attribute in both geometries: three.js keys GPU buffers by attribute, so the lines share one upload.
  const position = new BufferAttribute(positions, 3);
  return {
    faint: trailLine(position, TRAIL_OPACITY.faint),
    bright: trailLine(position, TRAIL_OPACITY.bright),
    halfWindowDays,
  };
}

function trailLine(position: BufferAttribute, opacity: number): Line {
  const geometry = new BufferGeometry().setAttribute('position', position);
  const material = new LineBasicMaterial({ color: APPROACH_COLOR, transparent: true, opacity });
  const line = new Line(geometry, material);
  line.raycast = IGNORE_RAYCAST;
  return line;
}

/** `primitive` objects are the caller's to dispose; R3F leaves them alone on unmount. */
function disposeTrailLines({ faint, bright }: TrailLines): void {
  for (const line of [faint, bright]) {
    line.geometry.dispose();
    if (line.material instanceof LineBasicMaterial) line.material.dispose();
  }
}
