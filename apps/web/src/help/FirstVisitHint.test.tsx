import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { findElementProps } from '../test/elementTree';
import { FirstVisitHintView, showsFirstVisitHint } from './FirstVisitHint';

describe('showsFirstVisitHint', () => {
  it('shows once the opening is done, for a viewer who has not seen it', () => {
    expect(showsFirstVisitHint({ openingPhase: 'done', hintSeen: false })).toBe(true);
  });

  it('never shows over the opening', () => {
    expect(showsFirstVisitHint({ openingPhase: 'waiting', hintSeen: false })).toBe(false);
    expect(showsFirstVisitHint({ openingPhase: 'playing', hintSeen: false })).toBe(false);
  });

  it('stays away once seen', () => {
    expect(showsFirstVisitHint({ openingPhase: 'done', hintSeen: true })).toBe(false);
  });
});

describe('FirstVisitHintView', () => {
  it('points to the ? key and the guide', () => {
    const markup = renderToStaticMarkup(<FirstVisitHintView onDismiss={() => undefined} />);
    expect(markup).toContain('New here? Press');
    expect(markup).toContain('<kbd>?</kbd>');
    expect(markup).toContain('for a short guide');
  });

  it('has a named dismiss button that calls onDismiss', () => {
    const onDismiss = vi.fn();
    const [button] = findElementProps<{ onClick: () => void; 'aria-label': string }>(
      FirstVisitHintView({ onDismiss }),
      'button',
    );
    expect(button?.['aria-label']).toBe('Dismiss hint');
    button?.onClick();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
