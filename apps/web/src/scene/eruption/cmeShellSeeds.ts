import { CME_SHELL_LOOK } from './cmeShellLook';

/** Per particle: cap-area fraction, azimuth (rad), distance as a fraction of the front's, brightness. */
export const SHELL_SEED_SIZE = 4;

export interface ShellSeed {
  capFraction: number;
  azimuthRad: number;
  radiusFraction: number;
  brightness: number;
}

/**
 * mulberry32 (Tommy Ettinger, public domain): a fixed seed gives the same shell on every load and in tests, and
 * the shell never depends on `Math.random`.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Seeds for `count` particles; the shader turns them into positions with the selected CME's cone. */
export function createShellSeeds(count: number, random: () => number): Float32Array {
  const seeds = new Float32Array(count * SHELL_SEED_SIZE);
  for (let index = 0; index < count; index += 1) {
    const seed = shellSeed(random);
    seeds.set(
      [seed.capFraction, seed.azimuthRad, seed.radiusFraction, seed.brightness],
      index * SHELL_SEED_SIZE,
    );
  }
  return seeds;
}

/** Three kinds of particle: the dim flanks, the rim's loop and the cap, all on DONKI's cone. */
function shellSeed(random: () => number): ShellSeed {
  const { flankShare, rimShare } = CME_SHELL_LOOK;
  const kind = random();
  if (kind < flankShare) return flankSeed(random);
  return sheathSeed(random, kind < flankShare + rimShare);
}

/** Squared depth crowds the particles at the leading edge and thins them out behind it. */
function sheathSeed(random: () => number, onRim: boolean): ShellSeed {
  const { rimCapFractionStart, sheathFraction, rimBrightnessRange, capBrightnessRange } =
    CME_SHELL_LOOK;
  const brightnessRange = onRim ? rimBrightnessRange : capBrightnessRange;
  return {
    capFraction: onRim ? between(random, rimCapFractionStart, 1) : random(),
    azimuthRad: 2 * Math.PI * random(),
    radiusFraction: 1 - sheathFraction * random() ** 2,
    brightness: between(random, brightnessRange.min, brightnessRange.max),
  };
}

function flankSeed(random: () => number): ShellSeed {
  const { rimCapFractionStart, flankStartFraction, sheathFraction, flankBrightnessRange } =
    CME_SHELL_LOOK;
  return {
    capFraction: between(random, rimCapFractionStart, 1),
    azimuthRad: 2 * Math.PI * random(),
    radiusFraction: between(random, flankStartFraction, 1 - sheathFraction),
    brightness: between(random, flankBrightnessRange.min, flankBrightnessRange.max),
  };
}

function between(random: () => number, start: number, end: number): number {
  return start + (end - start) * random();
}

export function shellSeedAt(seeds: Float32Array, index: number): ShellSeed {
  const offset = index * SHELL_SEED_SIZE;
  return {
    capFraction: seeds[offset] ?? 0,
    azimuthRad: seeds[offset + 1] ?? 0,
    radiusFraction: seeds[offset + 2] ?? 0,
    brightness: seeds[offset + 3] ?? 0,
  };
}
