// A camera-facing square around the Sun: the corner offset is added in view space, so the quad always faces the
// camera whatever the Sun's orientation. vOffsetRadii is the offset from the Sun's centre in solar radii.

#include <common>
#include <logdepthbuf_pars_vertex>

uniform float sunRadiusAu;
uniform float coronaExtentRadii;

varying vec2 vOffsetRadii;

void main() {
  vOffsetRadii = position.xy * coronaExtentRadii;
  vec4 viewPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  viewPosition.xy += vOffsetRadii * sunRadiusAu;
  gl_Position = projectionMatrix * viewPosition;

  #include <logdepthbuf_vertex>
}
