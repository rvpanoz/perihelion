import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { findElementProps } from '../test/elementTree';
import { DisplayPanel, type DisplayPanelProps } from './DisplayPanel';

interface ChangeProps<Value> {
  onChange: (event: { currentTarget: Value }) => void;
}

function panelProps(overrides: Partial<DisplayPanelProps> = {}): DisplayPanelProps {
  return {
    preference: 'auto',
    tierName: 'high',
    showTrails: true,
    onPreferenceChange: () => undefined,
    onShowTrailsChange: () => undefined,
    ...overrides,
  };
}

describe('DisplayPanel', () => {
  it('lists Auto, High, Medium and Low under a labelled Quality select', () => {
    const markup = renderToStaticMarkup(<DisplayPanel {...panelProps()} />);
    expect(markup).toMatch(/<label[^>]*>Quality<select/);
    const options = [...markup.matchAll(/<option value="(\w+)"/g)].map((match) => match[1]);
    expect(options).toEqual(['auto', 'high', 'medium', 'low']);
  });

  it('names the tier Auto picked', () => {
    const markup = renderToStaticMarkup(<DisplayPanel {...panelProps({ tierName: 'medium' })} />);
    expect(markup).toContain('<option value="auto" selected="">Auto (Medium)</option>');
  });

  it('shows plain Auto while a manual tier is chosen', () => {
    const markup = renderToStaticMarkup(
      <DisplayPanel {...panelProps({ preference: 'low', tierName: 'low' })} />,
    );
    expect(markup).toContain('<option value="auto">Auto</option>');
    expect(markup).toContain('<option value="low" selected="">Low</option>');
  });

  it('reports the chosen preference', () => {
    const onPreferenceChange = vi.fn();
    const [select] = findElementProps<ChangeProps<{ value: string }>>(
      DisplayPanel(panelProps({ onPreferenceChange })),
      'select',
    );
    select?.onChange({ currentTarget: { value: 'medium' } });
    select?.onChange({ currentTarget: { value: 'ultra' } });
    expect(onPreferenceChange.mock.calls).toEqual([['medium']]);
  });

  it('ticks a labelled Trails box while trails are on and reports a click', () => {
    const onShowTrailsChange = vi.fn();
    const props = panelProps({ onShowTrailsChange });
    expect(renderToStaticMarkup(<DisplayPanel {...props} />)).toMatch(
      /<label[^>]*><input type="checkbox" checked=""\/>Trails<\/label>/,
    );
    const [checkbox] = findElementProps<ChangeProps<{ checked: boolean }>>(
      DisplayPanel(props),
      'input',
    );
    checkbox?.onChange({ currentTarget: { checked: false } });
    expect(onShowTrailsChange).toHaveBeenCalledWith(false);
  });

  it('leaves the Trails box clear while trails are off', () => {
    const markup = renderToStaticMarkup(<DisplayPanel {...panelProps({ showTrails: false })} />);
    expect(markup).not.toMatch(/<input[^>]*checked/);
  });
});
