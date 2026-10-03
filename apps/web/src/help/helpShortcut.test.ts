import { describe, expect, it, vi } from 'vitest';
import { type HelpKeyEvent, isHelpShortcut, listenForHelpShortcut } from './helpShortcut';

function keyEvent(overrides: Partial<HelpKeyEvent> = {}): HelpKeyEvent {
  return {
    key: '?',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    target: { tagName: 'BODY' } as unknown as EventTarget,
    ...overrides,
  };
}

function targetOf(tagName: string, isContentEditable = false): EventTarget {
  return { tagName, isContentEditable } as unknown as EventTarget;
}

describe('isHelpShortcut', () => {
  it('accepts a plain ?', () => {
    expect(isHelpShortcut(keyEvent())).toBe(true);
  });

  it('ignores other keys', () => {
    expect(isHelpShortcut(keyEvent({ key: '/' }))).toBe(false);
    expect(isHelpShortcut(keyEvent({ key: 'h' }))).toBe(false);
  });

  it('leaves browser and system shortcuts alone', () => {
    expect(isHelpShortcut(keyEvent({ ctrlKey: true }))).toBe(false);
    expect(isHelpShortcut(keyEvent({ metaKey: true }))).toBe(false);
    expect(isHelpShortcut(keyEvent({ altKey: true }))).toBe(false);
  });

  it('ignores a held-down key repeating', () => {
    expect(isHelpShortcut(keyEvent({ repeat: true }))).toBe(false);
  });

  it('ignores keys typed into a form control or editable text', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(isHelpShortcut(keyEvent({ target: targetOf(tagName) }))).toBe(false);
    }
    expect(isHelpShortcut(keyEvent({ target: targetOf('DIV', true) }))).toBe(false);
  });

  it('accepts ? on a button, a list row or with no target', () => {
    expect(isHelpShortcut(keyEvent({ target: targetOf('BUTTON') }))).toBe(true);
    expect(isHelpShortcut(keyEvent({ target: targetOf('LI') }))).toBe(true);
    expect(isHelpShortcut(keyEvent({ target: null }))).toBe(true);
  });
});

/** `target` is left to `dispatchEvent`, which sets it (an Event's own `target` cannot be assigned). */
function keydown(key: string): Event {
  return Object.assign(new Event('keydown'), {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
  });
}

describe('listenForHelpShortcut', () => {
  it('opens help on ? and stops listening when unsubscribed', () => {
    const target = new EventTarget();
    const onOpen = vi.fn();
    const stop = listenForHelpShortcut(target, onOpen);
    target.dispatchEvent(keydown('?'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    stop();
    target.dispatchEvent(keydown('?'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not open help for other keys', () => {
    const target = new EventTarget();
    const onOpen = vi.fn();
    listenForHelpShortcut(target, onOpen);
    target.dispatchEvent(keydown('a'));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
