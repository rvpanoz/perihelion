// The magnetopause hint: world-space normal and eye vector for an edge-lit (Fresnel-like) translucent sheet, and
// how far round from the nose each point is, so the open tail end can fade out.

#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vWorldNormal;
varying vec3 vToEye;
varying float vSunwardCosine; // cos of the angle from the Sun–Earth line, model frame (+z is sunward)

void main() {
  vSunwardCosine = normalize(position).z;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vToEye = cameraPosition - worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;

  #include <logdepthbuf_vertex>
}
