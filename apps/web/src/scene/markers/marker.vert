// One vertex, drawn at a fixed size in device pixels, so the body stays findable at any zoom.

#include <common>
#include <logdepthbuf_pars_vertex>

uniform float sizePx;
uniform float pixelRatio;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // three.js scales PointsMaterial.size by the pixel ratio inside the renderer; a custom material must do it here.
  gl_PointSize = sizePx * pixelRatio;

  // The logarithmic depth buffer is always on; without this, the point depth-tests against the wrong values.
  #include <logdepthbuf_vertex>
}
