// The corona: brightness falls as r^-falloff from the limb (sunLook.ts), broken into streamers by angular simplex
// noise (simplexNoise3d.glsl, prepended), and faded to nothing at the quad's edge. Additive and HDR, so bloom
// spreads it. Inside the limb the disc, nearer the camera, hides it.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 coronaColor;
uniform float coronaFalloff;
uniform float coronaExtentRadii;
uniform float streamerContrast;
uniform float surfacePhase;

varying vec2 vOffsetRadii;

void main() {
  #include <logdepthbuf_fragment>
  float radius = length(vOffsetRadii);
  if (radius < 1.0 || radius > coronaExtentRadii) discard;
  vec2 direction = vOffsetRadii / radius;
  float streamers = snoise(vec3(direction * 2.5, 0.15 * surfacePhase));
  float falloff = pow(radius, -coronaFalloff) * (1.0 + streamerContrast * streamers);
  float edgeFade = 1.0 - smoothstep(0.6 * coronaExtentRadii, coronaExtentRadii, radius);
  gl_FragColor = vec4(coronaColor * max(falloff, 0.0) * edgeFade, 1.0);
}
