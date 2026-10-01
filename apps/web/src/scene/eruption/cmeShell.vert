// The CME shell's vertex shader: DONKI's cone model, a cone from the Sun's centre capped by a sphere about the Sun.
// cmeShellGeometry.ts mirrors this for the tests; the look constants arrive as uniforms from cmeShellLook.ts.

#include <common>
#include <logdepthbuf_pars_vertex>

attribute vec4 shellSeed; // cap-area fraction, azimuth (rad), distance as a fraction of the front's, brightness

uniform vec3 sunSceneOffsetAu;
uniform mat3 coneBasis;      // columns: x, y, axis (scene axes)
uniform float cosHalfAngle;
uniform float frontDistanceAu;
uniform float sheathFraction;
uniform float sheathBrightness;
uniform float pointSizePx;
uniform float pixelRatio;
uniform vec3 shellColor;

varying vec3 vColor;

void main() {
  // Even over the cap's area: cos θ = 1 − u (1 − cos α).
  float cosTheta = 1.0 - shellSeed.x * (1.0 - cosHalfAngle);
  float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
  vec3 along = vec3(sinTheta * cos(shellSeed.y), sinTheta * sin(shellSeed.y), cosTheta);
  float radiusAu = frontDistanceAu * shellSeed.z;
  vec3 sceneAu = sunSceneOffsetAu + coneBasis * along * radiusAu;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(sceneAu, 1.0);
  gl_PointSize = pointSizePx * pixelRatio;
  // Brightest at the leading edge, fading to `sheathBrightness` at the back of the sheath; the flanks' own dim
  // brightness (seed w) carries on behind it.
  float depthInSheath = clamp((1.0 - shellSeed.z) / sheathFraction, 0.0, 1.0);
  vColor = shellColor * shellSeed.w * mix(1.0, sheathBrightness, depthInSheath);

  // The logarithmic depth buffer is always on; without this, points depth-test against the wrong values.
  #include <logdepthbuf_vertex>
}
