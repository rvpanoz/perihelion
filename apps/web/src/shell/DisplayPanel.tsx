import {
  QUALITY_PREFERENCES,
  type QualityPreference,
  qualityPreferenceFrom,
} from '../quality/qualityStore';
import type { QualityTierName } from '../quality/qualityTiers';

export interface DisplayPanelProps {
  preference: QualityPreference;
  /** The tier on screen, which Auto names. */
  tierName: QualityTierName;
  showTrails: boolean;
  onPreferenceChange: (preference: QualityPreference) => void;
  onShowTrailsChange: (showTrails: boolean) => void;
}

const PREFERENCE_LABELS: Record<QualityPreference, string> = {
  auto: 'Auto',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * Quality and Trails, both native controls so the keyboard and screen readers get them for free. React state is fine
 * here: these change only on clicks or a rare tier change.
 */
export function DisplayPanel(props: DisplayPanelProps) {
  return (
    <section className="panel display-panel" aria-label="Display">
      {qualitySelect(props)}
      {trailsCheckbox(props)}
    </section>
  );
}

/** Plain functions, not components, so the tests can read the controls' handlers off the panel's element tree. */
function qualitySelect({ preference, tierName, onPreferenceChange }: DisplayPanelProps) {
  return (
    <label className="display-control">
      Quality
      <select
        value={preference}
        onChange={(event) => {
          const chosen = qualityPreferenceFrom(event.currentTarget.value);
          if (chosen) onPreferenceChange(chosen);
        }}
      >
        {QUALITY_PREFERENCES.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option, { preference, tierName })}
          </option>
        ))}
      </select>
    </label>
  );
}

function trailsCheckbox({ showTrails, onShowTrailsChange }: DisplayPanelProps) {
  return (
    <label className="display-control">
      <input
        type="checkbox"
        checked={showTrails}
        onChange={(event) => onShowTrailsChange(event.currentTarget.checked)}
      />
      Trails
    </label>
  );
}

/** Auto names the tier it picked, so the viewer can see what the governor chose. */
function optionLabel(
  option: QualityPreference,
  shown: { preference: QualityPreference; tierName: QualityTierName },
): string {
  if (option !== 'auto' || shown.preference !== 'auto') return PREFERENCE_LABELS[option];
  return `${PREFERENCE_LABELS.auto} (${PREFERENCE_LABELS[shown.tierName]})`;
}
