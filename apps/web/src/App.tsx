import { type ReactNode, useState } from 'react';
import { ApproachCard } from './approaches/ApproachCard';
import { ApproachList } from './approaches/ApproachList';
import { CloseUp } from './approaches/CloseUp';
import { useSelectedApproach } from './approaches/approachSelection';
import { followApproach, playApproach } from './approaches/playApproach';
import { type DatasetState, useDataset } from './data/useDataset';
import { type NeoCatalogState, useNeoCatalog } from './data/useNeoCatalog';
import { useNowMs } from './data/useNowMs';
import { swarmStressCopiesFromUrl } from './dev/swarmStress';
import { CmeCard } from './eruptions/CmeCard';
import { CmeList } from './eruptions/CmeList';
import { useSelectedCme } from './eruptions/cmeSelection';
import { SceneCanvas } from './scene/SceneCanvas';
import { FocusPicker } from './scene/camera/FocusPicker';
import { OpeningCaption } from './scene/opening/OpeningCaption';
import { SwarmControls } from './scene/swarm/SwarmControls';
import { AppShell } from './shell/AppShell';
import { Brand } from './shell/Brand';
import { DataStatusPill } from './shell/DataStatusPill';
import { ShellColumn } from './shell/ShellColumn';
import type { NamedDatasetState } from './shell/dataStatus';
import { chooseApproach, chooseCme } from './shell/shotSelection';
import { TimeControls } from './time/TimeControls';
import { jdTdbFromUnixMs } from './time/timeController';

type CloseApproachesState = DatasetState<'close-approaches'>;
type CmesState = DatasetState<'cmes'>;

/** Read once per load; production builds drop the dev-only stress tool entirely. */
const SWARM_STRESS_COPIES = import.meta.env.DEV
  ? swarmStressCopiesFromUrl(window.location.search)
  : 1;
const APPROACH_GROUPING_INTERVAL_MS = 30_000;

export function App() {
  const neoCatalog = useNeoCatalog();
  const closeApproaches = useDataset('close-approaches');
  const cmes = useDataset('cmes');
  const [showTrails, setShowTrails] = useState(true);
  const swarm =
    neoCatalog.status === 'ready'
      ? { catalog: neoCatalog.data, showTrails, stressCopies: SWARM_STRESS_COPIES }
      : undefined;
  const swarmControls = swarm && (
    <SwarmControls showTrails={showTrails} onShowTrailsChange={setShowTrails} />
  );
  return (
    <AppShell
      top={<ShellTop neoCatalog={neoCatalog} closeApproaches={closeApproaches} cmes={cmes} />}
      left={
        <ShellLeft closeApproaches={closeApproaches} cmes={cmes}>
          {swarmControls}
        </ShellLeft>
      }
      right={<ShellRight />}
      bottom={<TimeControls />}
    >
      <SceneCanvas swarm={swarm} openingCanStart={neoCatalog.status !== 'loading'} />
      <OpeningCaption neoCount={swarm?.catalog.count} />
    </AppShell>
  );
}

interface ShellTopProps {
  neoCatalog: NeoCatalogState;
  closeApproaches: CloseApproachesState;
  cmes: CmesState;
}

function ShellTop({ neoCatalog, closeApproaches, cmes }: ShellTopProps) {
  return (
    <>
      <Brand />
      <FocusPicker />
      <DataStatusPill
        datasets={[
          neoCatalogStatus(neoCatalog),
          { label: 'Close approaches', state: closeApproaches },
          { label: 'CMEs', state: cmes },
        ]}
      />
    </>
  );
}

/**
 * Passed and Coming split on the wall clock, refreshed every 30 s, not on the scrubbed time, so the groups never
 * jump while the viewer scrubs.
 */
function ShellLeft({
  closeApproaches,
  cmes,
  children,
}: {
  closeApproaches: CloseApproachesState;
  cmes: CmesState;
  children: ReactNode;
}) {
  const nowMs = useNowMs(APPROACH_GROUPING_INTERVAL_MS);
  const selected = useSelectedApproach();
  const selectedCme = useSelectedCme();
  return (
    <ShellColumn side="left" label="Events">
      <ApproachList
        state={closeApproaches}
        selected={selected}
        nowJdTdb={jdTdbFromUnixMs(nowMs)}
        onSelect={chooseApproach}
      />
      <CmeList state={cmes} selected={selectedCme} onSelect={chooseCme} />
      {children}
    </ShellColumn>
  );
}

/** The card for the selected shot; with nothing selected the column stays empty so the scene shows through. */
function ShellRight() {
  const selected = useSelectedApproach();
  const selectedCme = useSelectedCme();
  if (selectedCme !== undefined) {
    return (
      <ShellColumn side="right" label="Focus">
        <CmeCard cme={selectedCme} />
      </ShellColumn>
    );
  }
  if (selected === undefined) return null;
  return (
    <ShellColumn side="right" label="Focus">
      <ApproachCard
        approach={selected}
        onFollow={followApproach}
        onPlay={playApproach}
        closeUp={<CloseUp approach={selected} />}
      />
    </ShellColumn>
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
