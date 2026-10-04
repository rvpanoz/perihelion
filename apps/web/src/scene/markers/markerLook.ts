import { BODY_APPEARANCE } from '../bodies/bodyCatalog';

export interface MarkerLook {
  name: string;
  color: string;
  sizePx: number;
  /** Skip the depth test: drawn over the body's own disc, even when that disc is dark. */
  overBody?: boolean;
}

/**
 * Illustrative: from a shot's camera Earth's disc is often under a pixel, and the side facing the camera may be in
 * darkness, so a shot draws Earth a marker over its disc. Each shot names its own.
 */
export function earthMarkerLook(name: string): MarkerLook {
  return { name, color: BODY_APPEARANCE.earthMoonBarycenter.color, sizePx: 8, overBody: true };
}
