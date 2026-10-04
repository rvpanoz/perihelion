// swarmMesh.ts prepends roundSprite.glsl, which defines roundSpriteAlpha. Additive blending sums overlapping
// sprites, so only dense stacks pass the bloom threshold.

#include <common>
#include <logdepthbuf_pars_fragment>

varying vec3 vColor;

void main() {
  #include <logdepthbuf_fragment>
  // Core 0: the swarm's sprites fall off from the centre, so a lone faint NEO is a soft speck.
  float alpha = roundSpriteAlpha(gl_PointCoord, 0.0);
  if (alpha <= 0.0) discard;
  gl_FragColor = vec4(vColor, alpha);
}
