/**
 * Browser storage for per-viewer conveniences only. Reading `localStorage` throws in a private window or with site
 * data blocked, and it is absent outside a browser, so every access is guarded and the app works without it
 * (Review Focus 4).
 */
export function readStored(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The choice still holds for this session; it just won't survive a reload.
  }
}
