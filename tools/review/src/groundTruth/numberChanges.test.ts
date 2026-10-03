import { describe, expect, it } from 'vitest';
import { parseDiff } from '../diff/parseDiff.js';
import { modifiedFile, oneLineChange } from '../testing/diffText.js';
import { numberChanges } from './numberChanges.js';

const TEST_PATH = 'packages/orbit/src/angles.test.ts';

function changesFor(from: string, to: string) {
  return numberChanges(parseDiff(oneLineChange(TEST_PATH, { from, to })));
}

function valuesFor(from: string, to: string) {
  return changesFor(from, to).map(({ oldValue, newValue }) => [oldValue, newValue]);
}

describe('numberChanges', () => {
  it('describes a changed toBeCloseTo precision', () => {
    const [change, ...rest] = changesFor(
      '    expect(normalizeAngleRad(angleRad)).toBeCloseTo(expectedRad, 12);',
      '    expect(normalizeAngleRad(angleRad)).toBeCloseTo(expectedRad, 11);',
    );

    expect(rest).toEqual([]);
    expect(change).toEqual({
      path: TEST_PATH,
      newLineNumber: 14,
      oldLine: 'expect(normalizeAngleRad(angleRad)).toBeCloseTo(expectedRad, 12);',
      newLine: 'expect(normalizeAngleRad(angleRad)).toBeCloseTo(expectedRad, 11);',
      oldText: '12',
      newText: '11',
      oldValue: 12,
      newValue: 11,
      numberPosition: 1,
      nearbyLines: [
        'const a = 1;',
        'const b = 2;',
        'const c = 3;',
        '    expect(normalizeAngleRad(angleRad)).toBeCloseTo(expectedRad, 11);',
        'const d = 4;',
        'const e = 5;',
        'const f = 6;',
      ],
    });
  });

  it('gives each number on a line its position', () => {
    const changes = changesFor('toBeCloseTo(0.5, 15);', 'toBeCloseTo(0.6, 10);');

    expect(
      changes.map(({ numberPosition, oldText, newText }) => [numberPosition, oldText, newText]),
    ).toEqual([
      [1, '0.5', '0.6'],
      [2, '15', '10'],
    ]);
  });

  it('reads exponents, separators, bare decimals and negatives', () => {
    expect(valuesFor('const T = 1e-12;', 'const T = 1e-11;')).toEqual([[1e-12, 1e-11]]);
    expect(valuesFor('const N = 1_000;', 'const N = 2_000;')).toEqual([[1000, 2000]]);
    expect(valuesFor('scale(.5);', 'scale(.25);')).toEqual([[0.5, 0.25]]);
    expect(valuesFor('offset(-1);', 'offset(-2);')).toEqual([[-1, -2]]);
  });

  it('never splits a number out of an identifier', () => {
    expect(changesFor('const s = float32SlackAu;', 'const s = float64SlackAu;')).toEqual([]);
    expect(changesFor('const v = vec3(x);', 'const v = vec4(x);')).toEqual([]);
  });

  it('lists an index change, leaving its meaning to Jev', () => {
    expect(valuesFor('expect(arr[0]).toBe(x);', 'expect(arr[1]).toBe(x);')).toEqual([[0, 1]]);
  });

  it('ignores a rewrite of the same value and lines whose words changed', () => {
    expect(changesFor('const T = 1e-9;', 'const T = 1e-09;')).toEqual([]);
    expect(changesFor('expect(a).toBeLessThan(1e-9);', 'expect(b).toBeLessThan(1e-8);')).toEqual(
      [],
    );
  });

  it('only reads test files', () => {
    const text = oneLineChange('packages/orbit/src/angles.ts', { from: 'x(1);', to: 'x(2);' });
    expect(numberChanges(parseDiff(text))).toEqual([]);
  });

  it('pairs removed and added lines of a block in order', () => {
    const text = modifiedFile('a.test.ts', [
      '@@ -1,2 +1,3 @@',
      '-first(1);',
      '-second(2);',
      '+first(10);',
      '+second(20);',
      '+third(30);',
    ]);

    expect(numberChanges(parseDiff(text)).map((change) => change.newValue)).toEqual([10, 20]);
  });
});
