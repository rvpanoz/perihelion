import { radiusAu } from '../bodies/bodyCatalog';
import type { FocusId } from './focusPositions';

/** Closest zoom, in body radii from the centre: half a radius of clearance above the surface. */
export const MIN_VIEW_DISTANCE_RADII = 1.5;
/** Neptune's orbit (30 AU) fits comfortably; beyond this the scene is just dots. */
export const MAX_VIEW_DISTANCE_AU = 100;

const DEFAULT_VIEW_DISTANCE_RADII = 8;
/** The Sun's default view shows the inner system out to Mars rather than the Sun's disc. */
const SUN_DEFAULT_VIEW_DISTANCE_AU = 3;

/**
 * ~300 km: the marker is a fixed-size point with no radius to clear, so nothing closer would show more, and this
 * keeps it beyond the 1e-6 AU (~150 km) near plane.
 */
const ASTEROID_MIN_VIEW_DISTANCE_AU = 2e-6;
/** ~150,000 km, a few times a typical miss distance; following sets its own distance from the pass. */
const ASTEROID_DEFAULT_VIEW_DISTANCE_AU = 1e-3;

export function minViewDistanceAu(focus: FocusId): number {
  if (focus === 'asteroid') return ASTEROID_MIN_VIEW_DISTANCE_AU;
  return radiusAu(focus) * MIN_VIEW_DISTANCE_RADII;
}

export function defaultViewDistanceAu(focus: FocusId): number {
  if (focus === 'asteroid') return ASTEROID_DEFAULT_VIEW_DISTANCE_AU;
  return focus === 'sun'
    ? SUN_DEFAULT_VIEW_DISTANCE_AU
    : radiusAu(focus) * DEFAULT_VIEW_DISTANCE_RADII;
}
