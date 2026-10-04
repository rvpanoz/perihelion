import type { Planet } from '@perihelion/orbit';
import { Color } from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { BODY_APPEARANCE } from './bodyCatalog';

/**
 * `lineBasicMaterial` cannot widen a line: WebGL draws it one device pixel wide and aliased. `LineMaterial`
 * builds a screen-space quad per segment instead, so the width is ours and the shader smooths its own edges.
 */
export const ORBIT_LINE_LOOK = {
  /** In CSS pixels, so the line reads the same on any display; a hairline at 2× looked thinner than at 1×. */
  widthPx: 1.5,
  opacity: 0.35,
} as const;

export interface CanvasSizeCssPx {
  width: number;
  height: number;
}

export function createOrbitLineMaterial(planet: Planet): LineMaterial {
  return new LineMaterial({
    color: new Color(BODY_APPEARANCE[planet].color),
    linewidth: ORBIT_LINE_LOOK.widthPx,
    opacity: ORBIT_LINE_LOOK.opacity,
    transparent: true,
    // The shader's own antialiasing: alpha falls off across the last pixel of the quad.
    alphaToCoverage: true,
  });
}

/**
 * The shader turns a width in pixels into clip space, which it can only do knowing the canvas size, so this has to
 * be written by hand on every resize.
 */
export function writeOrbitLineResolution(
  material: LineMaterial,
  canvas: CanvasSizeCssPx,
): LineMaterial {
  material.resolution.set(canvas.width, canvas.height);
  return material;
}
