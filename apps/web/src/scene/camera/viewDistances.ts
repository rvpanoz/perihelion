import { type BodyId, radiusAu } from '../bodies/bodyCatalog';

/** Closest zoom, in body radii from the centre: half a radius of clearance above the surface. */
export const MIN_VIEW_DISTANCE_RADII = 1.5;
/** Neptune's orbit (30 AU) fits comfortably; beyond this the scene is just dots. */
export const MAX_VIEW_DISTANCE_AU = 100;

const DEFAULT_VIEW_DISTANCE_RADII = 8;
/** The Sun's default view shows the inner system out to Mars rather than the Sun's disc. */
const SUN_DEFAULT_VIEW_DISTANCE_AU = 3;

export function minViewDistanceAu(body: BodyId): number {
  return radiusAu(body) * MIN_VIEW_DISTANCE_RADII;
}

export function defaultViewDistanceAu(body: BodyId): number {
  return body === 'sun'
    ? SUN_DEFAULT_VIEW_DISTANCE_AU
    : radiusAu(body) * DEFAULT_VIEW_DISTANCE_RADII;
}
