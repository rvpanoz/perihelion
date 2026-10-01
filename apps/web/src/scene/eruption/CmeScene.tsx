import { useSelectedCme } from '../../eruptions/cmeSelection';
import { CmeShell } from './CmeShell';
import { EarthImpact } from './impact/EarthImpact';

/**
 * Mounts only while a CME is selected; everything per frame reads the time store, never React state. The impact at
 * Earth needs ENLIL's arrival (Task 4 decision 4), so a CME without one shows the shell only.
 */
export function CmeScene() {
  const selected = useSelectedCme();
  if (!selected) return null;
  const arrival = selected.analysis.earthArrival;
  return (
    <>
      <CmeShell cme={selected} />
      {arrival && <EarthImpact arrival={arrival} />}
    </>
  );
}
