/** The dev-only `?webgl=off`: shows the no-WebGL2 notice on a machine that has WebGL2. */
export function webGlForcedOffFromUrl(search: string): boolean {
  return new URLSearchParams(search).get('webgl') === 'off';
}
