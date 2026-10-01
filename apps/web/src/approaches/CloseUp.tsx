import type { CloseApproach } from '@perihelion/data';
import { useMemo } from 'react';
import { trailIndexAt } from '../scene/approach/approachTrail';
import { useTimeReadout } from '../time/useTimeReadout';
import { KM_PER_LUNAR_DISTANCE, distanceTexts } from './approachFormat';
import {
  CLOSE_UP_CENTRE_PX,
  CLOSE_UP_SIZE_PX,
  type CloseUpGeometry,
  closeUpGeometry,
  closeUpMarkerIndex,
} from './closeUpModel';

const HEADER_TEXT = 'FOCUS VIEW · EARTH-CENTRED · ILLUSTRATIVE';
const SCALE_TEXT = `1 LD = ${new Intl.NumberFormat('en-US').format(KM_PER_LUNAR_DISTANCE)} km`;
/** A symbol, not to scale: Earth's true radius is about 1/60 LD, a pixel or less here. */
const EARTH_RADIUS_PX = 5;
const MARKER_RADIUS_PX = 3;
/** Clears the dashed line so the label never sits on it. */
const LABEL_OFFSET_PX = 6;
const VIEW_BOX = `0 0 ${CLOSE_UP_SIZE_PX.width} ${CLOSE_UP_SIZE_PX.height}`;

export interface CloseUpProps {
  approach: CloseApproach;
}

/** The path is laid out once per selection; only `PassProgress` follows the clock, at the readout's 4 Hz. */
export function CloseUp({ approach }: CloseUpProps) {
  const geometry = useMemo(() => closeUpGeometry(approach), [approach]);
  return (
    <figure className="close-up">
      <figcaption className="close-up-head">{HEADER_TEXT}</figcaption>
      <svg className="close-up-view" viewBox={VIEW_BOX} role="img" aria-label="Path past Earth">
        <EarthAndRing ringRadiusPx={geometry.ringRadiusPx} />
        <ClosestLine geometry={geometry} label={distanceTexts(approach.distanceAu).lunar} />
        <polyline className="close-up-path faint" points={geometry.pointTexts.join(' ')} />
        <PassProgress approach={approach} geometry={geometry} />
      </svg>
      <p className="close-up-scale">{SCALE_TEXT}</p>
    </figure>
  );
}

function EarthAndRing({ ringRadiusPx }: { ringRadiusPx: number }) {
  const { x, y } = CLOSE_UP_CENTRE_PX;
  return (
    <>
      <circle className="close-up-ring" cx={x} cy={y} r={ringRadiusPx} />
      <circle className="close-up-earth" cx={x} cy={y} r={EARTH_RADIUS_PX} />
    </>
  );
}

/** Drawn to the engine's closest point but labelled with CAD's distance: the label is the fact. */
function ClosestLine({ geometry, label }: { geometry: CloseUpGeometry; label: string }) {
  const [x, y] = pixelAt(geometry, geometry.closestIndex);
  const { x: earthX, y: earthY } = CLOSE_UP_CENTRE_PX;
  return (
    <>
      <line className="close-up-closest" x1={earthX} y1={earthY} x2={x} y2={y} />
      <text className="close-up-label" x={(earthX + x) / 2 + LABEL_OFFSET_PX} y={(earthY + y) / 2}>
        {label}
      </text>
    </>
  );
}

/** Bright up to now, like the scene's trail; no marker outside the trail's window, where the asteroid is not. */
function PassProgress({
  approach,
  geometry,
}: {
  approach: CloseApproach;
  geometry: CloseUpGeometry;
}) {
  const offsetDays = useTimeReadout().jdTdb - approach.approachJdTdb;
  const brightCount = trailIndexAt(offsetDays, geometry.halfWindowDays) + 1;
  const markerIndex = closeUpMarkerIndex(offsetDays, geometry.halfWindowDays);
  return (
    <>
      <polyline
        className="close-up-path bright"
        points={geometry.pointTexts.slice(0, brightCount).join(' ')}
      />
      {markerIndex !== undefined && <Marker geometry={geometry} index={markerIndex} />}
    </>
  );
}

function Marker({ geometry, index }: { geometry: CloseUpGeometry; index: number }) {
  const [x, y] = pixelAt(geometry, index);
  return <circle className="close-up-marker" cx={x} cy={y} r={MARKER_RADIUS_PX} />;
}

function pixelAt(geometry: CloseUpGeometry, index: number): [number, number] {
  return [geometry.pixels[index * 2] ?? 0, geometry.pixels[index * 2 + 1] ?? 0];
}
