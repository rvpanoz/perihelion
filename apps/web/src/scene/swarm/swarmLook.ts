/**
 * The swarm's look: illustrative, not data. For a fixed albedo p, an asteroid's diameter is
 * D = 1329 km / √p · 10^(−H/5) (Pravec & Harris 2007), so log D falls linearly with H. Point size and
 * brightness follow the same straight line over the H range most NEOs span, clamped outside it.
 */
export const SWARM_LOOK = {
  absoluteMagnitudeRange: { brightest: 15, faintest: 28 },
  pointSizePx: { brightest: 4, faintest: 1 },
  brightness: { brightest: 1, faintest: 0.25 },
} as const;

/** In `NEO_ORBIT_CLASSES` order: Atira, Aten, Apollo, Amor. Starting values, tuned by eye. */
export const SWARM_CLASS_COLORS = ['#ffd166', '#ff7a3d', '#2f86e0', '#b45cff'] as const;

/** Opacity at a trail's head, falling with the square of the way back to 0 at the tail. Tuned by eye. */
export const SWARM_TRAIL_MAX_OPACITY = 0.12;

/** How long the swarm takes to fade in once its first frame draws, so it eases in rather than popping. */
export const SWARM_FADE_IN_SECONDS = 1;

/** 0 → 1 over the fade-in with smoothstep's easing, so it starts and settles without a visible step. */
export function swarmFadeIn(secondsSinceFirstFrame: number): number {
  const fraction = Math.min(Math.max(secondsSinceFirstFrame / SWARM_FADE_IN_SECONDS, 0), 1);
  return fraction * fraction * (3 - 2 * fraction);
}

// These mirror swarm.vert, which gets the same constants as uniforms and so holds no numbers of its own.

export function pointSizePx(absoluteMagnitude: number): number {
  const { brightest, faintest } = SWARM_LOOK.pointSizePx;
  return mix(brightest, faintest, faintness(absoluteMagnitude));
}

export function pointBrightness(absoluteMagnitude: number): number {
  const { brightest, faintest } = SWARM_LOOK.brightness;
  return mix(brightest, faintest, faintness(absoluteMagnitude));
}

/** 0 at the bright end of the H range, 1 at the faint end, clamped as GLSL `clamp` does. */
function faintness(absoluteMagnitude: number): number {
  const { brightest, faintest } = SWARM_LOOK.absoluteMagnitudeRange;
  const fraction = (absoluteMagnitude - brightest) / (faintest - brightest);
  return Math.min(Math.max(fraction, 0), 1);
}

/** GLSL `mix`. */
function mix(from: number, to: number, fraction: number): number {
  return from + (to - from) * fraction;
}
