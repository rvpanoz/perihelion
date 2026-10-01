// The Sun's photosphere: passes the surface point (unit sphere, so the noise turns with the Sun's mesh) and the
// view-space normal and eye vector the fragment shader needs for limb darkening.

#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vSurfacePoint;
varying vec3 vViewNormal;
varying vec3 vToEye;

void main() {
  vSurfacePoint = normalize(position);
  vViewNormal = normalize(normalMatrix * normal);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vToEye = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;

  #include <logdepthbuf_vertex>
}
