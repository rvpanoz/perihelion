// A soft round sprite: alpha falls from 1 at the centre to 0 at the edge. Additive blending sums overlapping
// sprites, so only dense stacks pass the bloom threshold.

#include <common>
#include <logdepthbuf_pars_fragment>

varying vec3 vColor;

void main() {
  #include <logdepthbuf_fragment>
  float fromCentre = length(gl_PointCoord - 0.5) * 2.0;
  float alpha = 1.0 - smoothstep(0.0, 1.0, fromCentre);
  if (alpha <= 0.0) discard;
  gl_FragColor = vec4(vColor, alpha);
}
