import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SwarmControls } from './SwarmControls';

interface CheckboxProps {
  onChange: (event: { currentTarget: { checked: boolean } }) => void;
}

/** The web tests have no DOM, so the change handler is read off the rendered element tree. */
function findCheckbox(node: unknown): CheckboxProps | undefined {
  if (!isValidElement<{ children?: unknown }>(node)) return undefined;
  if (node.type === 'input') return node.props as unknown as CheckboxProps;
  for (const child of [node.props.children].flat()) {
    const checkbox = findCheckbox(child);
    if (checkbox) return checkbox;
  }
  return undefined;
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
    const checkbox = findCheckbox(SwarmControls({ showTrails: true, onShowTrailsChange }));
    checkbox?.onChange({ currentTarget: { checked: false } });
    expect(onShowTrailsChange).toHaveBeenCalledWith(false);
  });
});
