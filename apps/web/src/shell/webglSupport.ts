/** The parts of a canvas the probe touches, so tests can pass a fake. */
export interface ProbeCanvas {
  getContext(contextId: 'webgl2'): ProbeContext | null;
}

interface ProbeContext {
  getExtension(name: 'WEBGL_lose_context'): { loseContext(): void } | null;
}

/**
 * Three.js renders only with WebGL2. The probe's context is released straight away: browsers cap live WebGL
 * contexts (16 in Chrome), and the scene's own canvas needs one.
 */
export function hasWebGl2(createCanvas: () => ProbeCanvas): boolean {
  const context = createCanvas().getContext('webgl2');
  context?.getExtension('WEBGL_lose_context')?.loseContext();
  return context !== null;
}
