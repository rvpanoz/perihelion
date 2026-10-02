import type { ReactNode } from 'react';
import { ApproachCard } from './approaches/ApproachCard';
import { ApproachList } from './approaches/ApproachList';
import { CloseUp } from './approaches/CloseUp';
import { useSelectedApproach } from './approaches/approachSelection';
import { followApproach, playApproach } from './approaches/playApproach';
import { type DatasetState, useDataset } from './data/useDataset';
import { type NeoCatalogState, useNeoCatalog } from './data/useNeoCatalog';
import { useNowMs } from './data/useNowMs';
import { swarmStressCopiesFromUrl } from './dev/swarmStress';
import {
  qualityStore,
  useQualityPreference,
  useQualityTierName,
  useShowTrails,
} from './quality/qualityStore';
import { CmeCard } from './eruptions/CmeCard';
import { CmeList } from './eruptions/CmeList';
import { useSelectedCme } from './eruptions/cmeSelection';
import { watchEruption } from './eruptions/watchEruption';
import { SceneCanvas } from './scene/SceneCanvas';
import { FocusPicker } from './scene/camera/FocusPicker';
import { OpeningCaption } from './scene/opening/OpeningCaption';
import { AppShell } from './shell/AppShell';
import { Brand } from './shell/Brand';
import { DataStatusPill } from './shell/DataStatusPill';
import { DisplayPanel } from './shell/DisplayPanel';
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
  const showTrails = useShowTrails();
  const swarm =
    neoCatalog.status === 'ready'
      ? { catalog: neoCatalog.data, showTrails, stressCopies: SWARM_STRESS_COPIES }
      : undefined;
  return (
    <AppShell
      top={<ShellTop neoCatalog={neoCatalog} closeApproaches={closeApproaches} cmes={cmes} />}
      left={<ShellLeft closeApproaches={closeApproaches} cmes={cmes} />}
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
}: {
  closeApproaches: CloseApproachesState;
  cmes: CmesState;
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
    </ShellColumn>
  );
}

/** The selected shot's card above the Display panel; the narrow layout's drawer is named for what it holds. */
function ShellRight() {
  const card = useFocusCard();
  return (
    <ShellColumn side="right" label={card ? 'Focus' : 'Display'}>
      {card}
      <QualityDisplayPanel />
    </ShellColumn>
  );
}

/** With nothing selected there is no card, so the scene shows through above the panel. */
function useFocusCard(): ReactNode {
  const selected = useSelectedApproach();
  const selectedCme = useSelectedCme();
  if (selectedCme !== undefined) return <CmeCard cme={selectedCme} onWatch={watchEruption} />;
  if (selected === undefined) return null;
  return (
    <ApproachCard
      approach={selected}
      onFollow={followApproach}
      onPlay={playApproach}
      closeUp={<CloseUp approach={selected} />}
    />
  );
}

function QualityDisplayPanel() {
  const preference = useQualityPreference();
  const tierName = useQualityTierName();
  const showTrails = useShowTrails();
  return (
    <DisplayPanel
      preference={preference}
      tierName={tierName}
      showTrails={showTrails}
      onPreferenceChange={qualityStore.setPreference}
      onShowTrailsChange={qualityStore.setTrailsPreference}
    />
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
