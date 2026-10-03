import { type KeyboardEvent, type RefObject, useEffect, useId, useRef, useState } from 'react';
import { HELP_TABS, type HelpEntry, type HelpTab, type HelpTabId } from './helpContent';
import { nextTabIndex } from './helpTabs';

export interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The guide, on a native `<dialog>`: `showModal()` brings the focus trap, Esc, the backdrop and focus return to the
 * opener. The default export is what `React.lazy` loads, so the copy stays out of the first download.
 */
export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  const dialogRef = useModal(open);
  const headingId = useId();
  const [selectedId, setSelectedId] = useState<HelpTabId>('seeing');
  return (
    <dialog
      ref={dialogRef}
      className="panel help-dialog"
      aria-labelledby={headingId}
      onClose={onClose}
    >
      <header className="help-header">
        <h2 id={headingId}>Perihelion guide</h2>
        <button
          type="button"
          className="help-close"
          aria-label="Close help"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
      </header>
      <HelpTabs selectedId={selectedId} onSelect={setSelectedId} />
    </dialog>
  );
}

/** The store says open or closed; Esc and the close button close the dialog itself, and `onClose` reports it back. */
function useModal(open: boolean): RefObject<HTMLDialogElement | null> {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return ref;
}

export interface HelpTabsProps {
  selectedId: HelpTabId;
  onSelect: (id: HelpTabId) => void;
}

/** The WAI-ARIA APG tabs pattern. Every panel is rendered and the unselected ones hidden, so each tab controls one. */
export function HelpTabs({ selectedId, onSelect }: HelpTabsProps) {
  const baseId = useId();
  const onKeyDown = tabKeyHandler({ selectedId, onSelect, baseId });
  return (
    <div className="help-tabs">
      <div role="tablist" aria-label="Guide sections" onKeyDown={onKeyDown}>
        {HELP_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            baseId={baseId}
            selected={tab.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
      {HELP_TABS.map((tab) => (
        <HelpPanel key={tab.id} tab={tab} baseId={baseId} hidden={tab.id !== selectedId} />
      ))}
    </div>
  );
}

/** Arrows, Home and End select and focus another tab; the tabs are found by id, so no refs are threaded through. */
function tabKeyHandler({ selectedId, onSelect, baseId }: HelpTabsProps & { baseId: string }) {
  return (event: KeyboardEvent<HTMLElement>) => {
    const index = HELP_TABS.findIndex((tab) => tab.id === selectedId);
    const next = nextTabIndex(event.key, { index, count: HELP_TABS.length });
    const tab = next === undefined ? undefined : HELP_TABS[next];
    if (tab === undefined) return;
    event.preventDefault();
    onSelect(tab.id);
    document.getElementById(tabId(baseId, tab.id))?.focus();
  };
}

interface TabButtonProps {
  tab: HelpTab;
  baseId: string;
  selected: boolean;
  onSelect: (id: HelpTabId) => void;
}

function TabButton({ tab, baseId, selected, onSelect }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      id={tabId(baseId, tab.id)}
      aria-selected={selected}
      aria-controls={panelId(baseId, tab.id)}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(tab.id)}
    >
      {tab.title}
    </button>
  );
}

function HelpPanel({ tab, baseId, hidden }: { tab: HelpTab; baseId: string; hidden: boolean }) {
  return (
    <div
      role="tabpanel"
      id={panelId(baseId, tab.id)}
      aria-labelledby={tabId(baseId, tab.id)}
      hidden={hidden}
      tabIndex={0}
      className="help-panel"
    >
      {tab.intro.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {tab.entries.length > 0 && (
        <dl className="help-entries">
          {tab.entries.map((entry) => (
            <HelpEntryView key={entry.term} entry={entry} />
          ))}
        </dl>
      )}
    </div>
  );
}

function HelpEntryView({ entry }: { entry: HelpEntry }) {
  const { still } = entry;
  return (
    <div className="help-entry">
      <dt>
        {entry.link ? (
          <a href={entry.link} target="_blank" rel="noreferrer">
            {entry.term}
          </a>
        ) : (
          entry.term
        )}
      </dt>
      <dd>
        {entry.text}
        {still && (
          <img
            src={still.src}
            alt={still.alt}
            width={still.width}
            height={still.height}
            loading="lazy"
            decoding="async"
          />
        )}
      </dd>
    </div>
  );
}

function tabId(baseId: string, id: HelpTabId): string {
  return `${baseId}-tab-${id}`;
}

function panelId(baseId: string, id: HelpTabId): string {
  return `${baseId}-panel-${id}`;
}
