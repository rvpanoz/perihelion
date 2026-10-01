import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { findElementProps } from '../../test/elementTree';
import { SwarmControls } from './SwarmControls';

interface CheckboxProps {
  onChange: (event: { currentTarget: { checked: boolean } }) => void;
}

describe('SwarmControls', () => {
  it('ticks the Trails box while trails are on', () => {
    const markup = renderToStaticMarkup(
      <SwarmControls showTrails onShowTrailsChange={() => undefined} />,
    );
    expect(markup).toContain('Trails');
    expect(markup).toMatch(/<input[^>]*checked/);
  });

  it('leaves the box clear while trails are off', () => {
    const markup = renderToStaticMarkup(
      <SwarmControls showTrails={false} onShowTrailsChange={() => undefined} />,
    );
    expect(markup).not.toMatch(/<input[^>]*checked/);
  });

  it('reports the box’s new state when the viewer clicks it', () => {
    const onShowTrailsChange = vi.fn();
    const [checkbox] = findElementProps<CheckboxProps>(
      SwarmControls({ showTrails: true, onShowTrailsChange }),
      'input',
    );
    checkbox?.onChange({ currentTarget: { checked: false } });
    expect(onShowTrailsChange).toHaveBeenCalledWith(false);
  });
});
