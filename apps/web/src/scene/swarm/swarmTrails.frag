// The vertex shader has already faded each trail vertex; additive blending then weighs colour by that alpha.

#include <common>
#include <logdepthbuf_pars_fragment>

varying vec4 vColor;

void main() {
  #include <logdepthbuf_fragment>
  gl_FragColor = vColor;
}
