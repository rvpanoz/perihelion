import { type Vector3, cross, dot, norm } from './vector3';

const RAD_PER_DEG = Math.PI / 180;

/**
 * The Sun's north rotation pole in ICRF/J2000 equatorial coordinates: α0 = 286.13°, δ0 = 63.87°, with no drift
 * (IAU WGCCRE 2015: Archinal et al. 2018, Celest. Mech. Dyn. Astron. 130:22, Table 1). Horizons' IAU_SUN frame
 * uses the same pole.
 */
const SUN_POLE_RIGHT_ASCENSION_RAD = 286.13 * RAD_PER_DEG;
const SUN_POLE_DECLINATION_RAD = 63.87 * RAD_PER_DEG;

/** Obliquity of the ecliptic at J2000, 84381.448″ (IAU 1976): the value of Horizons' ecliptic J2000 frame. */
export const OBLIQUITY_J2000_RAD = (84_381.448 / 3600) * RAD_PER_DEG;

/** A direction from the Sun's centre in HEEQ/Stonyhurst coordinates; longitude is positive toward solar west. */
export interface HeliographicDirection {
  latitudeRad: number;
  longitudeRad: number;
}

/** DONKI's cone model: apex at the Sun's centre, axis along `axis`, angular half-width `halfAngleRad`. */
export interface CmeCone {
  axis: HeliographicDirection;
  halfAngleRad: number;
}

/** Unit vector for a latitude/longitude on a frame's axes: x at longitude 0, z at latitude +90°. */
function unitFromSpherical(latitudeRad: number, longitudeRad: number): Vector3 {
  const cosLatitude = Math.cos(latitudeRad);
  return [
    cosLatitude * Math.cos(longitudeRad),
    cosLatitude * Math.sin(longitudeRad),
    Math.sin(latitudeRad),
  ];
}

/** Equatorial → ecliptic J2000: a rotation about x by the obliquity (Meeus, Astronomical Algorithms, eq. 13.5–13.6). */
export function equatorialToEcliptic(vector: Readonly<Vector3>): Vector3 {
  const cosObliquity = Math.cos(OBLIQUITY_J2000_RAD);
  const sinObliquity = Math.sin(OBLIQUITY_J2000_RAD);
  return [
    vector[0],
    cosObliquity * vector[1] + sinObliquity * vector[2],
    -sinObliquity * vector[1] + cosObliquity * vector[2],
  ];
}

/** HEEQ's z axis in heliocentric ecliptic J2000 (unit vector). */
export const SUN_POLE_ECLIPTIC_J2000: Readonly<Vector3> = equatorialToEcliptic(
  unitFromSpherical(SUN_POLE_DECLINATION_RAD, SUN_POLE_RIGHT_ASCENSION_RAD),
);

/**
 * Earth's heliographic latitude B0: the angle of the Sun→Earth line above the solar equator. It is Earth's latitude
 * in HEEQ (its HEEQ longitude is 0 by definition) and stays within ±7.25°, the solar equator's tilt.
 */
export function earthHeliographicLatitudeRad(earthPositionAu: Readonly<Vector3>): number {
  return Math.asin(dot(earthPositionAu, SUN_POLE_ECLIPTIC_J2000) / norm(earthPositionAu));
}

/**
 * HEEQ (Stonyhurst) direction → heliocentric ecliptic J2000 unit vector. HEEQ: z = the Sun's pole, x = the Sun→Earth
 * line projected onto the solar equator, y = z × x, which points to solar west (the right-hand limb seen from Earth),
 * so a source at W30 has longitude +30° (Hapgood 1992, Planet. Space Sci. 40, 711, §4; Thompson 2006, A&A 449, 791,
 * §7). `earthPositionAu` is heliocentric ecliptic J2000 at the CME's time.
 */
export function heliographicToEcliptic(
  direction: HeliographicDirection,
  earthPositionAu: Readonly<Vector3>,
  out: Vector3 = [0, 0, 0],
): Vector3 {
  const xAxis = heeqXAxis(earthPositionAu);
  const yAxis = cross(SUN_POLE_ECLIPTIC_J2000, xAxis);
  const [x, y, z] = unitFromSpherical(direction.latitudeRad, direction.longitudeRad);
  const pole = SUN_POLE_ECLIPTIC_J2000;
  out[0] = x * xAxis[0] + y * yAxis[0] + z * pole[0];
  out[1] = x * xAxis[1] + y * yAxis[1] + z * pole[1];
  out[2] = x * xAxis[2] + y * yAxis[2] + z * pole[2];
  return out;
}

/** The Sun→Earth direction with its component along the pole removed: the solar equator's central meridian. */
function heeqXAxis(earthPositionAu: Readonly<Vector3>): Vector3 {
  const pole = SUN_POLE_ECLIPTIC_J2000;
  const alongPole = dot(earthPositionAu, pole);
  const inEquator: Vector3 = [
    earthPositionAu[0] - alongPole * pole[0],
    earthPositionAu[1] - alongPole * pole[1],
    earthPositionAu[2] - alongPole * pole[2],
  ];
  const length = norm(inEquator);
  return [inEquator[0] / length, inEquator[1] / length, inEquator[2] / length];
}

/**
 * Angle between a HEEQ direction and Earth, which sits at (B0, 0) in HEEQ. atan2(|a × b|, a · b) keeps precision
 * for small angles, where acos would not.
 */
export function angleFromEarthRad(
  direction: HeliographicDirection,
  earthLatitudeRad: number,
): number {
  const axis = unitFromSpherical(direction.latitudeRad, direction.longitudeRad);
  const earth = unitFromSpherical(earthLatitudeRad, 0);
  return Math.atan2(norm(cross(axis, earth)), dot(axis, earth));
}

/** Whether Earth's direction lies within the cone (edge inclusive). Distance plays no part in the cone model. */
export function isEarthInsideCone(cone: CmeCone, earthLatitudeRad: number): boolean {
  return angleFromEarthRad(cone.axis, earthLatitudeRad) <= cone.halfAngleRad;
}
