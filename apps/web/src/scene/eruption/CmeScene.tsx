import { useSelectedCme } from '../../eruptions/cmeSelection';
import { CmeShell } from './CmeShell';

/** Mounts only while a CME is selected; everything per frame reads the time store, never React state. */
export function CmeScene() {
  const selected = useSelectedCme();
  return selected ? <CmeShell cme={selected} /> : null;
}
