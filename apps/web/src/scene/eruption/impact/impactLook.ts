/**
 * The Earth impact is illustrative (labelled so in the CME card): what it shows is shaped by published models, but
 * nothing here is DONKI data except ENLIL's arrival time and its glancing-blow / minor-impact flags.
 */
export const IMPACT_LOOK = {
  /** The impact builds over the hours before ENLIL's arrival and fades over about a day after it. */
  riseHours: 3,
  decayHours: 18,
  /** Below this the impact is over and nothing is drawn. */
  minimumLevel: 0.01,
  /** ENLIL's flags soften the impact. */
  glancingBlowStrength: 0.6,
  minorImpactStrength: 0.5,
  /**
   * Magnetopause (Shue et al. 1998, JGR 103, 17691): r = r0 (2 / (1 + cos θ))^α. Quiet r0 ≈ 10 R⊕; a strong CME
   * pushes it toward geosynchronous orbit (6.6 R⊕). α = 0.58 is a typical flaring.
   */
  quietStandoffEarthRadii: 10,
  compressedStandoffEarthRadii: 6.6,
  flaringAlpha: 0.58,
  /** The surface is drawn from the subsolar point back to this angle from the Sun–Earth line. */
  magnetopauseMaxAngleRad: (115 * Math.PI) / 180,
  /** A faint outline whenever an Earth-arrival CME is selected; the impact brightens it to the peak. */
  magnetopauseBaseOpacity: 0.08,
  magnetopausePeakOpacity: 0.4,
  magnetopauseColor: [0.45, 0.7, 1] as const,
  /**
   * Geomagnetic north pole of the IGRF-14 dipole, epoch 2025: 80.8° N, 72.6° W (NOAA NCEI). The south oval mirrors
   * it through Earth's centre.
   */
  geomagneticPoleLatitudeDeg: 80.8,
  geomagneticPoleLongitudeDeg: -72.6,
  /** Oval colatitude from the geomagnetic pole: ~18° when quiet, spreading equatorward to ~28° in a storm. */
  quietOvalColatitudeDeg: 18,
  stormOvalColatitudeDeg: 28,
  ovalWidthDeg: 3,
  /** Aurora sits ~100–300 km up; drawn as a shell 1.5 % above the surface. */
  auroraRadiusRatio: 1.015,
  auroraColor: [0.3, 1.8, 0.7] as const,
  /** Flicker per real second while the clock plays (illustrative motion, like the Sun's surface). */
  flickerPerSecond: 0.6,
} as const;
