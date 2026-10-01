import { useNowMs } from '../data/useNowMs';
import { type NamedDatasetState, dataStatus } from './dataStatus';

const AGE_REFRESH_MS = 30_000;

/** A `<details>` rather than a tooltip, so the per-dataset lines are reachable by keyboard too. */
export function DataStatusPill({ datasets }: { datasets: readonly NamedDatasetState[] }) {
  const nowMs = useNowMs(AGE_REFRESH_MS);
  const { tone, text, details } = dataStatus({ datasets, nowMs });
  const [head, ...rest] = text.split(' · ');
  return (
    <details className="panel pill" data-tone={tone}>
      <summary aria-live="polite">
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
  );
}
