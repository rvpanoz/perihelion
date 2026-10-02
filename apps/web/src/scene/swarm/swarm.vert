// The swarm's vertex shader. swarmMesh.ts prepends swarmKepler.glsl, which defines SwarmOrbit and
// swarmHeliocentricPosition. The look constants arrive as uniforms from swarmLook.ts; this file holds no numbers
// of its own beyond the mapping formula.

#include <common>
#include <logdepthbuf_pars_vertex>

attribute vec3 motion;
attribute vec3 perihelionAxisAu;
attribute vec3 minorAxisAu;
attribute vec2 appearance; // absolute magnitude H, orbit class index

uniform float elapsedDays;
uniform vec3 sunSceneOffsetAu;
uniform float pixelRatio;
uniform vec2 absoluteMagnitudeRange; // H at the bright end, H at the faint end
uniform vec2 pointSizePx;            // at the bright end, at the faint end
uniform vec2 brightness;             // at the bright end, at the faint end
uniform vec3 classColors[4];         // NEO_ORBIT_CLASSES order
uniform float fadeIn;                // 0 → 1 as the swarm first appears

varying vec3 vColor;

void main() {
  SwarmOrbit orbit = SwarmOrbit(motion, perihelionAxisAu, minorAxisAu);
  vec3 sceneAu = sunSceneOffsetAu + swarmHeliocentricPosition(orbit, elapsedDays);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(sceneAu, 1.0);

  // log D is linear in H (Pravec & Harris 2007), so size and brightness fall linearly across the range.
  float faintness = clamp(
    (appearance.x - absoluteMagnitudeRange.x) / (absoluteMagnitudeRange.y - absoluteMagnitudeRange.x),
    0.0,
    1.0
  );
  gl_PointSize = mix(pointSizePx.x, pointSizePx.y, faintness) * pixelRatio;
  // Additive blending: scaling the colour is the fade.
  vColor = classColors[int(appearance.y)] * mix(brightness.x, brightness.y, faintness) * fadeIn;

  // The logarithmic depth buffer is always on; without this, points depth-test against the wrong values.
  #include <logdepthbuf_vertex>
}
