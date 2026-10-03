import type { NumberChange } from '../groundTruth/numberChanges.js';

export function numberChange(overrides: Partial<NumberChange> = {}): NumberChange {
  return {
    path: 'packages/orbit/src/elements.test.ts',
    newLineNumber: 165,
    oldLine: 'expect(error).toBeLessThan(1e-11);',
    newLine: 'expect(error).toBeLessThan(1e-9);',
    oldText: '1e-11',
    newText: '1e-9',
    oldValue: 1e-11,
    newValue: 1e-9,
    numberPosition: 1,
    nearbyLines: ['expect(error).toBeLessThan(1e-9);'],
    ...overrides,
  };
}
