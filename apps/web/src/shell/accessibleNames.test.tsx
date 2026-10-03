import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ApproachCard } from '../approaches/ApproachCard';
import { ApproachList } from '../approaches/ApproachList';
import { CmeCard } from '../eruptions/CmeCard';
import { CmeList } from '../eruptions/CmeList';
import { FirstVisitHintView } from '../help/FirstVisitHint';
import { HelpButton } from '../help/HelpControl';
import HelpDialog from '../help/HelpDialog';
import { FocusPicker } from '../scene/camera/FocusPicker';
import { closeApproachRow } from '../test/closeApproachRow';
import { cmeRow } from '../test/cmeRow';
import { TimeControls } from '../time/TimeControls';
import { DisplayPanel } from './DisplayPanel';

const ignore = () => undefined;
const FETCHED_AT = '2026-10-01T12:00:00.000Z';
const APPROACH = closeApproachRow();
const CME = cmeRow();

/**
 * Every panel with buttons, inputs or selects, with data, so each kind of control is rendered at least once. The
 * status pill's only control is a `<summary>`, which always has text (DataStatusPill.test.tsx).
 */
const PANELS = {
  TimeControls: <TimeControls />,
  FocusPicker: <FocusPicker />,
  ApproachList: (
    <ApproachList
      state={{ status: 'ready', origin: 'fresh', fetchedAt: FETCHED_AT, data: [APPROACH] }}
      selected={APPROACH}
      nowJdTdb={APPROACH.approachJdTdb}
      onSelect={ignore}
    />
  ),
  ApproachCard: <ApproachCard approach={APPROACH} onFollow={ignore} onPlay={ignore} />,
  CmeList: (
    <CmeList
      state={{ status: 'ready', origin: 'fresh', fetchedAt: FETCHED_AT, data: [CME] }}
      selected={CME}
      onSelect={ignore}
    />
  ),
  CmeCard: <CmeCard cme={CME} onWatch={ignore} />,
  DisplayPanel: (
    <DisplayPanel
      preference="auto"
      tierName="high"
      showTrails
      onPreferenceChange={ignore}
      onShowTrailsChange={ignore}
    />
  ),
  HelpButton: <HelpButton onOpen={ignore} />,
  HelpDialog: <HelpDialog open={false} onClose={ignore} />,
  FirstVisitHint: <FirstVisitHintView onDismiss={ignore} />,
};

/** Visible text a screen reader would read: tags dropped, `aria-hidden` parts (glyphs, swatches) removed first. */
function spokenText(html: string): string {
  return html
    .replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** A label's own words, without the options of a select it wraps. */
function labelText(html: string): string {
  return spokenText(html.replace(/<select[\s\S]*?<\/select>/g, ''));
}

function isNamedByAttribute(tag: string): boolean {
  return /aria-label="[^"]+"/.test(tag);
}

/** Buttons named by their text or `aria-label`; inputs and selects by `aria-label` or a wrapping `<label>`. */
function unnamedControls(markup: string): string[] {
  const unnamedButtons = [...markup.matchAll(/(<button[^>]*>)([\s\S]*?)<\/button>/g)]
    .filter(([, tag = '', inner = '']) => !isNamedByAttribute(tag) && spokenText(inner) === '')
    .map(([button = '']) => button);
  const unlabelled = markup.replace(/<label[^>]*>([\s\S]*?)<\/label>/g, (label, inner: string) =>
    labelText(inner) === '' ? label : '',
  );
  const unnamedFields = [...unlabelled.matchAll(/<(?:input|select)[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => !isNamedByAttribute(tag));
  return [...unnamedButtons, ...unnamedFields];
}

describe('accessible names', () => {
  it.each(Object.entries(PANELS))('every control in %s has a name', (_name, panel) => {
    const markup = renderToStaticMarkup(panel);
    expect(markup).toMatch(/<(button|input|select)/);
    expect(unnamedControls(markup)).toEqual([]);
  });

  it('catches a control without one', () => {
    expect(
      unnamedControls('<button><span aria-hidden="true">▶</span></button><input type="range">'),
    ).toEqual(['<button><span aria-hidden="true">▶</span></button>', '<input type="range">']);
  });
});
