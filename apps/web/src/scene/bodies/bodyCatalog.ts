import { KM_PER_AU, PLANETS, type Planet } from '@perihelion/orbit';
import { Color } from 'three';

export type BodyId = 'sun' | Planet;

export const BODY_IDS: readonly BodyId[] = ['sun', ...PLANETS];

export interface BodyAppearance {
  label: string;
  radiusKm: number;
  color: string;
}

/**
 * Mean radii from the IAU WGCCRE 2015 report (Archinal et al. 2018, Celest. Mech. Dyn. Astron. 130:22); the
 * Sun's is the IAU 2015 nominal solar radius (Resolution B3). Colours are illustrative. Standish gives the
 * Earth–Moon barycentre, not Earth, so "Earth" is drawn there, ≈ 4,670 km from Earth's centre.
 */
export const BODY_APPEARANCE: Record<BodyId, BodyAppearance> = {
  sun: { label: 'Sun', radiusKm: 695_700, color: '#fff4e0' },
  mercury: { label: 'Mercury', radiusKm: 2_439.4, color: '#9c9a96' },
  venus: { label: 'Venus', radiusKm: 6_051.8, color: '#e8d3a2' },
  earthMoonBarycenter: { label: 'Earth', radiusKm: 6_371.0084, color: '#4f7cff' },
  mars: { label: 'Mars', radiusKm: 3_389.5, color: '#c1440e' },
  jupiter: { label: 'Jupiter', radiusKm: 69_911, color: '#d8ca9d' },
  saturn: { label: 'Saturn', radiusKm: 58_232, color: '#e3d8a8' },
  uranus: { label: 'Uranus', radiusKm: 25_362, color: '#9fd8e0' },
  neptune: { label: 'Neptune', radiusKm: 24_622, color: '#4a6fe3' },
};

/** Linear RGB above 1, so the Sun is the only thing that crosses the bloom threshold (Task 6). */
export const SUN_GLOW_COLOR = new Color(4, 3.4, 2.6);

/**
 * No distance falloff (decay 0): inverse-square would leave Neptune 900× darker than Earth. Illustrative.
 * Kept low enough that a lit planet's diffuse term (≈ intensity/π × colour) stays below 1 and never blooms.
 */
export const SUN_LIGHT_INTENSITY = 2.5;

export function radiusAu(body: BodyId): number {
  return BODY_APPEARANCE[body].radiusKm / KM_PER_AU;
}
