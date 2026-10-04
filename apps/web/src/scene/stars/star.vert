// Each star as one point on a shell around the camera. The look constants arrive as uniforms from starLook.ts;
// this file holds no numbers of its own beyond the mapping formula.

#include <common>
#include <logdepthbuf_pars_vertex>

attribute vec2 appearance; // visual magnitude, B−V colour index

uniform float pixelRatio;
uniform vec2 magnitudeRange;   // at the bright end, at the faint end
uniform vec2 pointSizePx;      // at those two ends
uniform vec2 brightness;       // at those two ends
uniform vec2 colorIndexRange;  // B−V at the blue end, at the red end
uniform vec3 blueColor;
uniform vec3 neutralColor;
uniform vec3 redColor;

varying vec3 vColor;

/** Blue below B−V 0, red above it: the ramp bends at white, which is where an A0 star sits. */
vec3 starTint(float colorIndex) {
  float warmth = clamp(
    (colorIndex - colorIndexRange.x) / (colorIndexRange.y - colorIndexRange.x),
    0.0,
    1.0
  );
  float neutralAt = (0.0 - colorIndexRange.x) / (colorIndexRange.y - colorIndexRange.x);
  return warmth < neutralAt
    ? mix(blueColor, neutralColor, warmth / neutralAt)
    : mix(neutralColor, redColor, (warmth - neutralAt) / (1.0 - neutralAt));
}

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  float faintness = clamp(
    (appearance.x - magnitudeRange.x) / (magnitudeRange.y - magnitudeRange.x),
    0.0,
    1.0
  );
  gl_PointSize = mix(pointSizePx.x, pointSizePx.y, faintness) * pixelRatio;
  // Additive blending: scaling the colour is the brightness.
  vColor = starTint(appearance.y) * mix(brightness.x, brightness.y, faintness);

  // The logarithmic depth buffer is always on; without this, points depth-test against the wrong values.
  #include <logdepthbuf_vertex>
}
