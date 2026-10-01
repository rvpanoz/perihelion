/**
 * The Sun's look. Limb darkening follows the linear law I(μ)/I(1) = 1 − u (1 − μ), μ the cosine of the angle
 * between the surface normal and the line of sight (Eddington; e.g. Gray, The Observation and Analysis of Stellar
 * Photospheres, ch. 17). u ≈ 0.6 in visible light and grows toward the blue, which reddens the limb; the per-channel
 * values here are illustrative, chosen in that order. Granulation, corona brightness and streamers are illustrative.
 */
export const SUN_LOOK = {
  /**
   * Linear RGB at disc centre. Its mean is just above the bloom threshold, so the centre glows a little while the
   * limb and the granulation stay below white after tone mapping and remain visible up close.
   */
  photosphereColor: [1.5, 1.0, 0.5] as const,
  /** Linear-law coefficients for red, green, blue. */
  limbDarkening: [0.5, 0.62, 0.75] as const,
  /** Noise cells per unit sphere radius: a mottled photosphere at the closest zoom, not a granule count. */
  granulationScale: 18,
  /** ± brightness from the granulation noise. */
  granulationContrast: 0.25,
  /** Noise phase per real second while the clock plays (the surface freezes when paused). */
  surfaceFlowPerSecond: 0.08,
  /** The corona billboard's half-size, in solar radii. */
  coronaExtentRadii: 4,
  /** Linear RGB at the limb, falling off as r^-falloff; below 1, so only where it overlaps the disc's bloom. */
  coronaColor: [0.75, 0.62, 0.48] as const,
  coronaFalloff: 2.5,
  /** ± brightness from the streamers' angular noise. */
  streamerContrast: 0.35,
} as const;

/** CPU mirror of sunSurface.frag's limb darkening, for tests: 1 at disc centre, 1 − u at the limb. */
export function limbDarkeningFactor(mu: number, coefficient: number): number {
  const clamped = Math.min(Math.max(mu, 0), 1);
  return 1 - coefficient * (1 - clamped);
}

/** CPU mirror of corona.frag's radial falloff (streamers and edge fade aside): 1 at the limb. */
export function coronaFalloffFactor(radiusInSolarRadii: number): number {
  return radiusInSolarRadii < 1 ? 0 : radiusInSolarRadii ** -SUN_LOOK.coronaFalloff;
}
