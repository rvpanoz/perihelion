// Auroral ovals around both geomagnetic poles (impactLook.ts): a Gaussian band at the oval's colatitude, on the
// night side only, flickering with simplex noise (simplexNoise3d.glsl, prepended) and brighter toward the limb,
// where the curtains are seen edge-on. Additive and illustrative.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 geomagneticPole; // unit, Earth-fixed mesh frame
uniform vec3 sunDirection;    // unit, Earth → Sun, scene axes
uniform float ovalColatitudeRad;
uniform float ovalWidthRad;
uniform float impactLevel;
uniform float flickerPhase;
uniform vec3 auroraColor;

varying vec3 vEarthFixed;
varying vec3 vWorldNormal;
varying vec3 vToEye;

void main() {
  #include <logdepthbuf_fragment>
  float fromPole = acos(clamp(abs(dot(vEarthFixed, geomagneticPole)), 0.0, 1.0));
  float band = exp(-0.5 * pow((fromPole - ovalColatitudeRad) / ovalWidthRad, 2.0));
  vec3 normal = normalize(vWorldNormal);
  float night = 1.0 - smoothstep(-0.15, 0.1, dot(normal, sunDirection));
  float flicker = 0.65 + 0.35 * snoise(vEarthFixed * 14.0 + vec3(0.0, flickerPhase, 0.0));
  float limb = 0.35 + 0.65 * pow(1.0 - abs(dot(normal, normalize(vToEye))), 1.5);
  gl_FragColor = vec4(auroraColor * band * night * flicker * limb * impactLevel, 1.0);
}
