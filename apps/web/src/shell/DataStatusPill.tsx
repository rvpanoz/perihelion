import { useNowMs } from '../data/useNowMs';
import { type NamedDatasetState, dataStatus } from './dataStatus';

const AGE_REFRESH_MS = 30_000;

/**
 * A `<details>` rather than a tooltip, so the per-dataset lines are reachable by keyboard too. Only the head word is
 * announced: the visible age ticks every minute, and a screen reader would re-read the whole pill each time.
 */
export function DataStatusPill({ datasets }: { datasets: readonly NamedDatasetState[] }) {
  const nowMs = useNowMs(AGE_REFRESH_MS);
  const { tone, text, details } = dataStatus({ datasets, nowMs });
  const [head, ...rest] = text.split(' · ');
  return (
    <>
      <details className="panel pill" data-tone={tone}>
        <summary>
          <span className="pill-dot" aria-hidden="true" />
          <b>{head}</b>
          {rest.map((part) => ` · ${part}`).join('')}
        </summary>
        <ul>
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <span className="visually-hidden" aria-live="polite">{`Data status: ${head}`}</span>
    </>
  );
}
