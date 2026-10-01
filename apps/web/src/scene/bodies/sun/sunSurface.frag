// The photosphere: linear-law limb darkening per channel (sunLook.ts) times an illustrative granulation from
// three octaves of simplex noise (simplexNoise3d.glsl, prepended). The colour stays above 1 so the disc blooms.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 surfaceColor;
uniform vec3 limbDarkening;
uniform float granulationScale;
uniform float granulationContrast;
uniform float surfacePhase;

varying vec3 vSurfacePoint;
varying vec3 vViewNormal;
varying vec3 vToEye;

float granulation(vec3 point) {
  vec3 flow = vec3(surfacePhase, -0.7 * surfacePhase, 0.4 * surfacePhase);
  float coarse = snoise(point * granulationScale + flow);
  float fine = snoise(point * granulationScale * 2.3 - 1.6 * flow);
  float finest = snoise(point * granulationScale * 5.1 + 2.4 * flow);
  return 0.55 * coarse + 0.3 * fine + 0.15 * finest;
}

void main() {
  #include <logdepthbuf_fragment>
  float mu = clamp(dot(normalize(vViewNormal), normalize(vToEye)), 0.0, 1.0);
  vec3 limb = 1.0 - limbDarkening * (1.0 - mu);
  float mottle = 1.0 + granulationContrast * granulation(vSurfacePoint);
  gl_FragColor = vec4(surfaceColor * limb * mottle, 1.0);
}
