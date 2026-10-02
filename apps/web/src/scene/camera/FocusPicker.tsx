import { useSyncExternalStore } from 'react';
import { BODY_APPEARANCE, BODY_IDS } from '../bodies/bodyCatalog';
import { cameraRig } from './cameraRig';

const readFocus = () => cameraRig.focus;

/** The same reader serves server rendering, which the accessible-name test uses. */
export function FocusPicker() {
  const focus = useSyncExternalStore(cameraRig.subscribe, readFocus, readFocus);
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
