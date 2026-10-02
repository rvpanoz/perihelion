import { describe, expect, it, vi } from 'vitest';
import { type ProbeCanvas, hasWebGl2 } from './webglSupport';

function canvasWith(context: ReturnType<ProbeCanvas['getContext']>): ProbeCanvas {
  return { getContext: vi.fn(() => context) };
}

describe('hasWebGl2', () => {
  it('is true when a canvas gives a WebGL2 context, and releases that context at once', () => {
    const loseContext = vi.fn();
    const canvas = canvasWith({ getExtension: () => ({ loseContext }) });
    expect(hasWebGl2(() => canvas)).toBe(true);
    expect(canvas.getContext).toHaveBeenCalledWith('webgl2');
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('is true without the lose-context extension too', () => {
    expect(hasWebGl2(() => canvasWith({ getExtension: () => null }))).toBe(true);
  });

  it('is false when the browser has no WebGL2', () => {
    expect(hasWebGl2(() => canvasWith(null))).toBe(false);
  });
});
