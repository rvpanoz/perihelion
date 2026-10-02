import { describe, expect, it } from 'vitest';
import {
  columnDetailsProps,
  SHEETS_LAYOUT_QUERY,
  shellLayoutFor,
  WIDE_LAYOUT_QUERY,
} from './shellLayout';

function matchingOnly(...queries: string[]): (query: string) => boolean {
  return (query) => queries.includes(query);
}

describe('shellLayoutFor', () => {
  it('is wide when the wide query matches', () => {
    expect(shellLayoutFor(matchingOnly(WIDE_LAYOUT_QUERY))).toBe('wide');
  });

  it('is sheets on a phone, upright or sideways', () => {
    expect(shellLayoutFor(matchingOnly(SHEETS_LAYOUT_QUERY))).toBe('sheets');
  });

  it('is drawers in between', () => {
    expect(shellLayoutFor(matchingOnly())).toBe('drawers');
  });
});

describe('columnDetailsProps', () => {
  it('opens both columns in the wide layout, with no group name', () => {
    expect(columnDetailsProps('wide')).toEqual({ open: true });
  });

  it('starts the drawers closed, each opening on its own', () => {
    expect(columnDetailsProps('drawers')).toEqual({ open: false });
  });

  it('groups the sheets under one name, so opening one closes the other', () => {
    expect(columnDetailsProps('sheets')).toEqual({ open: false, name: 'shell-sheet' });
  });
});
