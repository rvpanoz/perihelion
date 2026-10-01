import { SOLAR_RADIUS_AU } from '@perihelion/orbit';

/** Illustrative look of the CME shell. The geometry (axis, half-angle, front distance) is DONKI's; these are not. */
export const CME_SHELL_LOOK = {
  particleCount: 24_000,
  /** Share of particles placed near the cone's rim, so the shell's edge reads as the loop seen in coronagraphs. */
  rimShare: 0.3,
  /** The rim particles fill the outer part of the cap: cap-area fraction 0.85 → 1. */
  rimCapFractionStart: 0.85,
  /**
   * Share of particles spread along the cone's walls from near the Sun to the sheath, dim, so the shell reads as a
   * cone from the Sun and not a lens floating in space.
   */
  flankShare: 0.25,
  /** The flanks start this far out, as a fraction of the front's distance. */
  flankStartFraction: 0.1,
  /** The sheath behind the leading edge, as a fraction of the front's distance. */
  sheathFraction: 0.12,
  pointSizePx: 2,
  /** Linear RGB; dense stacks at the leading edge cross the bloom threshold (1), single sprites do not. */
  color: [1.2, 0.58, 0.26] as const,
  /** Particles at the back of the sheath keep this share of the leading edge's brightness. */
  sheathBrightness: 0.4,
  /** Brightness by particle kind: the rim's loop brightest, the cap's face dimmer, the flanks faint. */
  rimBrightnessRange: { min: 0.6, max: 1 },
  capBrightnessRange: { min: 0.3, max: 0.6 },
  flankBrightnessRange: { min: 0.15, max: 0.35 },
} as const;

/**
 * The shell fades in as the front leaves the photosphere (held at 1 R☉ before launch, `cmeFrontDistanceAu`) and
 * fades out once it is well past Earth's orbit, so a scrubbed clock never shows it parked at the Sun or in deep space.
 */
export const CME_SHELL_FADE = {
  inStartAu: SOLAR_RADIUS_AU,
  inEndAu: 5 * SOLAR_RADIUS_AU,
  outStartAu: 1.4,
  outEndAu: 2,
} as const;
