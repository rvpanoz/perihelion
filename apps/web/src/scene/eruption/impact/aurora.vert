// The aurora shell: the Earth-fixed point (the mesh shares Earth's rotation) for the oval, and world-space normal
// and eye vector for the night side and the limb.

#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vEarthFixed;
varying vec3 vWorldNormal;
varying vec3 vToEye;

void main() {
  vEarthFixed = normalize(position);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vToEye = cameraPosition - worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;

  #include <logdepthbuf_vertex>
}
