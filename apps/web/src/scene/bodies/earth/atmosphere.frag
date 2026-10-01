// The halo fades from the limb outward: seen from outside, a back face's normal turns from facing away from the eye
// (behind the planet, hidden) to perpendicular at the halo's edge, so 1 − |n · eye| falls to 0 at the edge. It is
// brighter on the day side. Additive.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 sunDirection;
uniform vec3 rimColor;
uniform float haloStrength;

varying vec3 vWorldNormal;
varying vec3 vToEye;

void main() {
  #include <logdepthbuf_fragment>
  vec3 normal = normalize(vWorldNormal);
  float facing = abs(dot(normal, normalize(vToEye)));
  float halo = pow(facing, 3.0);
  float lit = 0.1 + 0.9 * smoothstep(-0.3, 0.4, dot(normal, sunDirection));
  gl_FragColor = vec4(rimColor * halo * lit * haloStrength, 1.0);
}
