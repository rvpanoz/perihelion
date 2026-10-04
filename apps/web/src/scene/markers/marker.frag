// markerMaterial.ts prepends roundSprite.glsl, which defines roundSpriteAlpha.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 color;
uniform float spriteCore;

void main() {
  #include <logdepthbuf_fragment>
  float alpha = roundSpriteAlpha(gl_PointCoord, spriteCore);
  if (alpha <= 0.0) discard;
  gl_FragColor = vec4(color, alpha);
}
