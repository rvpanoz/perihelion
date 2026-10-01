// Earth's surface: world-space normal and eye vector for the terminator and rim, and the map's UVs.

#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vToEye;

void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vToEye = cameraPosition - worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;

  #include <logdepthbuf_vertex>
}
