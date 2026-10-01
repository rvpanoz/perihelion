import { useSyncExternalStore } from 'react';
import { BODY_APPEARANCE, BODY_IDS } from '../bodies/bodyCatalog';
import { cameraRig } from './cameraRig';

export function FocusPicker() {
  const focus = useSyncExternalStore(cameraRig.subscribe, () => cameraRig.focus);
  return (
    <nav className="panel focus-picker" aria-label="Focus">
      {BODY_IDS.map((body) => (
        <button
          key={body}
          type="button"
          aria-pressed={body === focus}
          onClick={() => cameraRig.flyTo({ focus: body })}
        >
          {BODY_APPEARANCE[body].label}
        </button>
      ))}
    </nav>
  );
}
