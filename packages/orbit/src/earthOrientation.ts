import { equatorialToEcliptic } from './heliographic';
import type { Vector3 } from './vector3';

const J2000_JD = 2_451_545.0;

/** Earth's body axes in heliocentric ecliptic J2000: toward Greenwich, toward 90° E, and the north pole. */
export interface EarthBodyAxes {
  greenwich: Vector3;
  east: Vector3;
  pole: Vector3;
}

/**
 * Earth Rotation Angle, IAU 2000 Resolution B1.8: θ = 2π (0.7790572732640 + 1.00273781191135448 (JD_UT1 − 2451545.0)),
 * in [0, 2π). The fraction of the JD is taken apart from the whole days so the product keeps precision.
 */
export function earthRotationAngleRad(jdUt1: number): number {
  const daysSinceJ2000 = jdUt1 - J2000_JD;
  const turns =
    0.779_057_273_264 + 0.002_737_811_911_354_48 * daysSinceJ2000 + (daysSinceJ2000 % 1);
  const fraction = turns - Math.floor(turns);
  return 2 * Math.PI * fraction;
}

/**
 * Earth's orientation for drawing: the pole is the J2000 celestial pole and Greenwich sits at the Earth Rotation
 * Angle from the J2000 equinox. Precession and nutation since J2000 (≈ 0.36° by 2026) and UT1 − UTC (< 0.9 s) are
 * ignored; the result places the day side's continents, not observations.
 */
export function earthBodyAxesEcliptic(jdUt1: number): EarthBodyAxes {
  const angleRad = earthRotationAngleRad(jdUt1);
  const cosAngle = Math.cos(angleRad);
  const sinAngle = Math.sin(angleRad);
  return {
    greenwich: equatorialToEcliptic([cosAngle, sinAngle, 0]),
    east: equatorialToEcliptic([-sinAngle, cosAngle, 0]),
    pole: equatorialToEcliptic([0, 0, 1]),
  };
}
