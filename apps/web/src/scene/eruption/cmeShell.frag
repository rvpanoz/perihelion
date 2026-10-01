// A soft round sprite, faded as a whole by the shell's opacity. Additive blending sums overlapping sprites, so
// only the dense leading edge passes the bloom threshold.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform float opacity;

varying vec3 vColor;

void main() {
  #include <logdepthbuf_fragment>
  float fromCentre = length(gl_PointCoord - 0.5) * 2.0;
  float alpha = (1.0 - smoothstep(0.0, 1.0, fromCentre)) * opacity;
  if (alpha <= 0.0) discard;
  gl_FragColor = vec4(vColor, alpha);
}
