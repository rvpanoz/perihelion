/** The parts of a `KeyboardEvent` the shortcut reads, so tests can pass plain objects (the web tests have no DOM). */
export type HelpKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat' | 'target'
>;

const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * `?` opens help, as on GitHub and Gmail. Not while the viewer types into a control, not with a modifier (those
 * belong to the browser and the system), and not on auto-repeat, so holding the key opens it once.
 */
export function isHelpShortcut(event: HelpKeyEvent): boolean {
  if (event.key !== '?' || event.repeat) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !takesTextEntry(event.target);
}

/** Returns the unsubscribe. The target is injected because the web tests have no DOM. */
export function listenForHelpShortcut(target: EventTarget, onOpen: () => void): () => void {
  const onKeyDown = (event: Event) => {
    if (isHelpShortcut(event as KeyboardEvent)) onOpen();
  };
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}

function takesTextEntry(target: EventTarget | null): boolean {
  if (target === null || !('tagName' in target)) return false;
  const element = target as { tagName: unknown; isContentEditable?: unknown };
  return element.isContentEditable === true || TEXT_ENTRY_TAGS.has(String(element.tagName));
}
