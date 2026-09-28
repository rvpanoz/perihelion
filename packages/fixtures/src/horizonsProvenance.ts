import { HorizonsError } from './horizonsResponse';

/** What a Horizons result header says the response was computed from. */
export interface HeaderProvenance {
  /** Horizons' own timestamp as printed (Pasadena local time), not the generator's clock. */
  generatedAt: string;
  /** Planetary ephemeris behind the Sun's position, e.g. "DE441". */
  ephemeris: string;
  /** The target's data source: an orbit solution such as "JPL#659", or the ephemeris for planets. */
  targetSource: string;
}

/** Header lines Horizons prints only for small-body osculating elements. */
export interface ElementsProvenance {
  /**
   * Small-body perturber set used in the orbit fit, e.g. "SB441-N16". Null for trajectories
   * reconstructed from spacecraft tracking (Bennu: "ORX_merged_DE424"), which print no such line.
   */
  perturbers: string | null;
  /** Sun GM Horizons used to derive the osculating elements. */
  keplerianGmAu3PerDay2: number;
}

// Header lines look like "Target body name: 433 Eros (A898 PA)   {source: JPL#659}".
const GENERATED_AT = /^Ephemeris \/ \S+ (.+?)\s+\/ Horizons/m;
const TARGET_SOURCE = /^Target body name:.*\{source: ([^}]+)\}/m;
const CENTER_SOURCE = /^Center body name:.*\{source: ([^}]+)\}/m;
const PERTURBERS_SOURCE = /^Small perturbers:.*\{source: ([^}]+)\}/m;
const KEPLERIAN_GM = /^Keplerian GM\s*:\s*(\S+)/m;

export function readHeaderProvenance(resultText: string): HeaderProvenance {
  return {
    generatedAt: headerField(resultText, GENERATED_AT, 'generation time'),
    ephemeris: headerField(resultText, CENTER_SOURCE, 'center body source'),
    targetSource: headerField(resultText, TARGET_SOURCE, 'target body source'),
  };
}

export function readElementsProvenance(resultText: string): ElementsProvenance {
  return {
    perturbers: optionalHeaderField(resultText, PERTURBERS_SOURCE),
    keplerianGmAu3PerDay2: Number(headerField(resultText, KEPLERIAN_GM, 'Keplerian GM')),
  };
}

function headerField(resultText: string, pattern: RegExp, label: string): string {
  const value = optionalHeaderField(resultText, pattern);
  if (value === null) throw new HorizonsError(`Horizons header has no ${label}`);
  return value;
}

function optionalHeaderField(resultText: string, pattern: RegExp): string | null {
  return pattern.exec(resultText)?.[1]?.trim() ?? null;
}
