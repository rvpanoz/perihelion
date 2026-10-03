import { describe, expect, it } from 'vitest';
import { trailerLines } from './trailers.js';

describe('trailerLines', () => {
  it('finds a closing block of git trailers', () => {
    const message = [
      'Add the review workspace',
      '',
      'Body text.',
      '',
      'Co-Authored-By: Someone <someone@example.com>',
      'Signed-off-by: Someone',
    ].join('\n');

    expect(trailerLines(message)).toEqual([
      'Co-Authored-By: Someone <someone@example.com>',
      'Signed-off-by: Someone',
    ]);
  });

  it('never treats the subject line as a trailer', () => {
    expect(trailerLines('Fix: the orbit')).toEqual([]);
  });

  it('ignores a last paragraph that mixes prose with a key-value line', () => {
    expect(trailerLines('Subject\n\nSome prose here.\nNote: more prose')).toEqual([]);
  });

  it('ignores trailing blank lines', () => {
    expect(trailerLines('Subject\n\nSigned-off-by: Someone\n\n')).toEqual([
      'Signed-off-by: Someone',
    ]);
  });
});
