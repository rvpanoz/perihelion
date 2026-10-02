// The trails' vertex shader. Every NEO draws the same 9-vertex strip as one instance; each vertex sits
// swarmTrailLagDays behind the head on the NEO's own orbit, so trails reuse the swarm's one Kepler solver.
// swarmMesh.ts prepends swarmKepler.glsl.

#include <common>
#include <logdepthbuf_pars_vertex>

attribute float trailStep; // 0 at the head, SWARM_TRAIL_SAMPLES at the tail
attribute vec3 motion;
attribute vec3 perihelionAxisAu;
attribute vec3 minorAxisAu;
attribute vec2 appearance; // absolute magnitude H, orbit class index

uniform float elapsedDays;
uniform vec3 sunSceneOffsetAu;
uniform vec3 classColors[4]; // NEO_ORBIT_CLASSES order
uniform float trailMaxOpacity;
uniform float fadeIn; // 0 → 1 as the swarm first appears

varying vec4 vColor;

void main() {
  SwarmOrbit orbit = SwarmOrbit(motion, perihelionAxisAu, minorAxisAu);
  float sampleDays = elapsedDays - swarmTrailLagDays(motion.z, trailStep);
  vec3 sceneAu = sunSceneOffsetAu + swarmHeliocentricPosition(orbit, sampleDays);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(sceneAu, 1.0);

  // Squared falloff: most of the trail's light sits near the head, so the tail fades out rather than ending.
  float towardHead = 1.0 - trailStep / SWARM_TRAIL_SAMPLES;
  vColor = vec4(classColors[int(appearance.y)], trailMaxOpacity * towardHead * towardHead * fadeIn);

  // The logarithmic depth buffer is always on; without this, trails depth-test against the wrong values.
  #include <logdepthbuf_vertex>
}
