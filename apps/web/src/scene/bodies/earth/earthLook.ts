/**
 * Earth's look, all illustrative: the day map is NASA's Blue Marble Next Generation (public domain); the night side
 * is the same map dimmed and tinted (city lights are Phase 7), blended across a soft terminator; the rim glow
 * stands in for the atmosphere.
 */
export const EARTH_LOOK = {
  /** Capped at 2048 × 1024 and 600 KB so it loads fast (this one is 478 KB). */
  dayTextureUrl: '/textures/earth-day-2048.jpg',
  /** Half-width of the terminator blend, in cos(Sun angle): ±0.1 is about ±6° of arc. */
  twilightWidth: 0.1,
  dayBrightness: 1.7,
  /** The night side keeps this much of the map's luminance, tinted blue, so continents stay faintly readable. */
  nightBrightness: 0.04,
  nightTint: [0.55, 0.7, 1] as const,
  rimColor: [0.35, 0.6, 1] as const,
  rimPower: 5,
  /** The halo shell's radius, in Earth radii, and its brightness. */
  haloRadiusRatio: 1.03,
  haloStrength: 1.2,
} as const;

/** CPU mirror of earthSurface.frag's terminator blend: 0 on the night side, 1 in daylight, ½ on the terminator. */
export function daylightFactor(sunCosine: number): number {
  const { twilightWidth } = EARTH_LOOK;
  const t = Math.min(Math.max((sunCosine + twilightWidth) / (2 * twilightWidth), 0), 1);
  return t * t * (3 - 2 * t);
}
