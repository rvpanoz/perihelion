type AppStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The two calls the app makes, backed by a map: what a browser's `localStorage` does for them. */
export function memoryStorage(): AppStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
}

/** A private window or blocked site data: every access throws. */
export function throwingStorage(): AppStorage {
  const refuse = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  return { getItem: refuse, setItem: refuse };
}
