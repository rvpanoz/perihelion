import { useSelectedCme } from '../../eruptions/cmeSelection';
import { bodyPositions } from '../bodies/bodyPositions';
import { FixedSizeMarker } from '../markers/FixedSizeMarker';
import { earthMarkerLook } from '../markers/markerLook';
import { CmeShell } from './CmeShell';
import { EarthImpact } from './impact/EarthImpact';

/** From the cruise's 2.6 AU Earth is a pixel lost in the swarm; the marker shows where the front is heading. */
const ERUPTION_EARTH_MARKER = earthMarkerLook('eruption-earth-marker');

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
      <FixedSizeMarker
        look={ERUPTION_EARTH_MARKER}
        positionAu={bodyPositions.earthMoonBarycenter}
      />
      {arrival && <EarthImpact arrival={arrival} />}
    </>
  );
}
