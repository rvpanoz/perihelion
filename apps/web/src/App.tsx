import { useState } from 'react';
import { type NeoCatalogState, useNeoCatalog } from './data/useNeoCatalog';
import { swarmStressCopiesFromUrl } from './dev/swarmStress';
import { SceneCanvas } from './scene/SceneCanvas';
import { FocusPicker } from './scene/camera/FocusPicker';
import { OpeningCaption } from './scene/opening/OpeningCaption';
import { SwarmControls } from './scene/swarm/SwarmControls';
import { AppShell } from './shell/AppShell';
import { Brand } from './shell/Brand';
import { DataStatusPill } from './shell/DataStatusPill';
import { ShellColumn } from './shell/ShellColumn';
import type { NamedDatasetState } from './shell/dataStatus';
import { TimeControls } from './time/TimeControls';

/** Read once per load; production builds drop the dev-only stress tool entirely. */
const SWARM_STRESS_COPIES = import.meta.env.DEV
  ? swarmStressCopiesFromUrl(window.location.search)
  : 1;

export function App() {
  const neoCatalog = useNeoCatalog();
  const [showTrails, setShowTrails] = useState(true);
  const swarm =
    neoCatalog.status === 'ready'
      ? { catalog: neoCatalog.data, showTrails, stressCopies: SWARM_STRESS_COPIES }
      : undefined;
  const left = swarm && (
    <ShellColumn side="left" label="Asteroids">
      <SwarmControls showTrails={showTrails} onShowTrailsChange={setShowTrails} />
    </ShellColumn>
  );
  return (
    <AppShell top={<ShellTop neoCatalog={neoCatalog} />} left={left} bottom={<TimeControls />}>
      <SceneCanvas swarm={swarm} openingCanStart={neoCatalog.status !== 'loading'} />
      <OpeningCaption neoCount={swarm?.catalog.count} />
    </AppShell>
  );
}

function ShellTop({ neoCatalog }: { neoCatalog: NeoCatalogState }) {
  return (
    <>
      <Brand />
      <FocusPicker />
      <DataStatusPill datasets={[neoCatalogStatus(neoCatalog)]} />
    </>
  );
}

function neoCatalogStatus(state: NeoCatalogState): NamedDatasetState {
  if (state.status !== 'ready') return { label: 'NEO catalog', state };
  return {
    label: 'NEO catalog',
    state,
    summary: `${state.data.count.toLocaleString('en-US')} asteroids`,
  };
}
