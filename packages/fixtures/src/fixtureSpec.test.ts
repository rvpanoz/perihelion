import { describe, expect, it } from 'vitest';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_HORIZONS_COMMANDS,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_HORIZONS_IDS,
  PLANET_SAMPLE_JD_TDB,
  julianDateOfNewYear,
} from './fixtureSpec';

describe('julianDateOfNewYear', () => {
  it('matches the Standish Table 1 range ends and the Meeus J2000 anchor', () => {
    expect(julianDateOfNewYear(1800)).toBe(2378496.5);
    expect(julianDateOfNewYear(2000)).toBe(2451544.5);
    expect(julianDateOfNewYear(2050)).toBe(2469807.5);
  });
});

describe('fixture spec', () => {
  it('samples every decade of 1800–2050 plus J2000, ascending', () => {
    expect(PLANET_SAMPLE_JD_TDB).toHaveLength(27);
    expect(PLANET_SAMPLE_JD_TDB).toContain(2451545);
    expect(PLANET_SAMPLE_JD_TDB).toEqual([...PLANET_SAMPLE_JD_TDB].sort((a, b) => a - b));
  });

  it('uses Horizons planet-system barycentres 1–8 (Standish "EM Bary" is body 3)', () => {
    expect(Object.values(PLANET_HORIZONS_IDS)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('marks every asteroid command as a small-body lookup', () => {
    for (const command of Object.values(ASTEROID_HORIZONS_COMMANDS))
      expect(command).toMatch(/^\d+;$/);
  });

  it('samples asteroids around their osculating epoch', () => {
    expect(ASTEROID_SAMPLE_JD_TDB).toContain(ASTEROID_EPOCH_JD_TDB);
    expect(ASTEROID_SAMPLE_JD_TDB[0]).toBe(ASTEROID_EPOCH_JD_TDB - 120);
    expect(ASTEROID_SAMPLE_JD_TDB.at(-1)).toBe(ASTEROID_EPOCH_JD_TDB + 120);
  });
});
