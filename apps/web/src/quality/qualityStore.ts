import { useSyncExternalStore } from 'react';
import { QUALITY_TIERS, type QualityTier, type QualityTierName } from './qualityTiers';

/**
 * The tier on screen and the viewer's trail choice. Changes come from the governor (rarely) and the Display panel
 * (on clicks), never per frame, so React subscribers re-render only on real changes.
 */
export class QualityStore {
  #tierName: QualityTierName = 'high';
  /** `undefined` until the viewer chooses: the tier's default applies. */
  #trailsPreference: boolean | undefined;
  readonly #listeners = new Set<() => void>();

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
    if (showTrails === this.#trailsPreference) return;
    this.#trailsPreference = showTrails;
    this.#notify();
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
