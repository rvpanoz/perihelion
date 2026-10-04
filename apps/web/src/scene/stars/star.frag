// starfieldMesh.ts prepends roundSprite.glsl, which defines roundSpriteAlpha.

#include <common>
#include <logdepthbuf_pars_fragment>

varying vec3 vColor;

void main() {
  #include <logdepthbuf_fragment>
  // Core 0: a star falls off from its centre, so even the brightest reads as a point of light, not a disc.
  float alpha = roundSpriteAlpha(gl_PointCoord, 0.0);
  if (alpha <= 0.0) discard;
  gl_FragColor = vec4(vColor, alpha);
}
