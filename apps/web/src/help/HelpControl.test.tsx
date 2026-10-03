import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { findElementProps } from '../test/elementTree';
import { HelpButton, HelpControl } from './HelpControl';

describe('HelpButton', () => {
  it('is named Help, says it opens a dialog and announces the ? shortcut', () => {
    const markup = renderToStaticMarkup(<HelpButton onOpen={() => undefined} />);
    expect(markup).toContain('aria-label="Help"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-keyshortcuts="?"');
  });

  it('opens help when clicked', () => {
    const onOpen = vi.fn();
    const [button] = findElementProps<{ onClick: () => void }>(HelpButton({ onOpen }), 'button');
    button?.onClick();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('HelpControl', () => {
  it('shows the button but loads no dialog until help is first opened', () => {
    const markup = renderToStaticMarkup(<HelpControl />);
    expect(markup).toContain('aria-label="Help"');
    expect(markup).not.toContain('<dialog');
  });
});
