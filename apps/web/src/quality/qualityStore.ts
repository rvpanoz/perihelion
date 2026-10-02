import { useSyncExternalStore } from 'react';
import { readStored, writeStored } from '../state/safeStorage';
import { QUALITY_TIERS, type QualityTier, type QualityTierName } from './qualityTiers';
import { TierGovernor } from './tierGovernor';

export type QualityPreference = 'auto' | QualityTierName;

/** In the Display panel's order. */
export const QUALITY_PREFERENCES: readonly QualityPreference[] = ['auto', 'high', 'medium', 'low'];

const PREFERENCE_KEY = 'perihelion.quality';
const TRAILS_KEY = 'perihelion.trails';

/**
 * The tier on screen, the viewer's Quality and Trails choices, and on Auto the governor that picks the tier.
 * `recordFrame` runs every frame but only notifies when the tier changes; everything else changes on clicks, so React
 * subscribers re-render only on real changes. Both choices persist per browser.
 */
export class QualityStore {
  #preference: QualityPreference = parsePreference(readStored(PREFERENCE_KEY));
  #tierName: QualityTierName = this.#preference === 'auto' ? 'high' : this.#preference;
  /** `undefined` until the viewer chooses: the tier's default applies. */
  #trailsPreference: boolean | undefined = parseTrails(readStored(TRAILS_KEY));
  /** Only on Auto, and only once the device's first guess is in (`applyFirstGuess`). */
  #governor: TierGovernor | undefined;
  readonly #listeners = new Set<() => void>();

  get preference(): QualityPreference {
    return this.#preference;
  }

  get tierName(): QualityTierName {
    return this.#tierName;
  }

  get tier(): QualityTier {
    return QUALITY_TIERS[this.#tierName];
  }

  get showTrails(): boolean {
    return this.#trailsPreference ?? this.tier.trailsByDefault;
  }

  /** Arrow properties, so they can be passed unbound: `setTrailsPreference` as a checkbox's handler. */
  setTierName = (tierName: QualityTierName): void => {
    if (tierName === this.#tierName) return;
    this.#tierName = tierName;
    this.#notify();
  };

  setTrailsPreference = (showTrails: boolean | undefined): void => {
    if (showTrails !== undefined) writeStored(TRAILS_KEY, String(showTrails));
    if (showTrails === this.#trailsPreference) return;
    this.#trailsPreference = showTrails;
    this.#notify();
  };

  setPreference = (preference: QualityPreference): void => {
    this.setPreferenceForThisLoad(preference);
    writeStored(PREFERENCE_KEY, preference);
  };

  /** The dev-only `?tier=`: a bench run must not leave its tier behind for the next load. */
  setPreferenceForThisLoad = (preference: QualityPreference): void => {
    if (preference === this.#preference) return;
    this.#preference = preference;
    // Back on Auto, the governor starts from the tier on screen with a fresh warm-up (Review Focus 5).
    this.#governor = preference === 'auto' ? new TierGovernor(this.#tierName) : undefined;
    if (preference !== 'auto') this.#tierName = preference;
    this.#notify();
  };

  /** Once per load, from `QualityGovernor`; a manual preference or a running governor wins. */
  applyFirstGuess = (tierName: QualityTierName): void => {
    if (this.#preference !== 'auto' || this.#governor) return;
    this.#governor = new TierGovernor(tierName);
    this.setTierName(tierName);
  };

  recordFrame = (frameMs: number): void => {
    const governor = this.#governor;
    if (governor?.recordFrame(frameMs)) this.setTierName(governor.tier);
  };

  /** A hidden tab's frames say nothing about rendering cost (Review Focus 2). */
  discardFrameWindow = (): void => {
    this.#governor?.discardWindow();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const qualityStore = new QualityStore();

export function useQualityTier(): QualityTier {
  return useSyncExternalStore(qualityStore.subscribe, () => qualityStore.tier);
}

export function useShowTrails(): boolean {
  return useSyncExternalStore(qualityStore.subscribe, () => qualityStore.showTrails);
}

export function useQualityPreference(): QualityPreference {
  return useSyncExternalStore(qualityStore.subscribe, () => qualityStore.preference);
}

export function useQualityTierName(): QualityTierName {
  return useSyncExternalStore(qualityStore.subscribe, () => qualityStore.tierName);
}

/** Storage and form values are untrusted strings; only a known preference gets through. */
export function qualityPreferenceFrom(value: string | undefined): QualityPreference | undefined {
  return QUALITY_PREFERENCES.find((preference) => preference === value);
}

/** Anything but a known stored preference reads as Auto. */
function parsePreference(stored: string | undefined): QualityPreference {
  return qualityPreferenceFrom(stored) ?? 'auto';
}

/** Anything but a stored choice reads as no choice, so the tier's default applies. */
function parseTrails(stored: string | undefined): boolean | undefined {
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return undefined;
}
