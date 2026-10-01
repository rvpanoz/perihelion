// Brightest where the sheet is seen edge-on, so it reads as a bubble around Earth rather than a fog, and fading out
// toward the open tail end. Additive.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 magnetopauseColor;
uniform float opacity;
uniform float tailFadeCosine; // cos of the drawn surface's last angle: faded to nothing there

varying vec3 vWorldNormal;
varying vec3 vToEye;
varying float vSunwardCosine;

void main() {
  #include <logdepthbuf_fragment>
  float facing = abs(dot(normalize(vWorldNormal), normalize(vToEye)));
  float edge = pow(1.0 - facing, 3.0);
  float tailFade = smoothstep(tailFadeCosine, tailFadeCosine + 0.5, vSunwardCosine);
  gl_FragColor = vec4(magnetopauseColor * edge * tailFade * opacity, 1.0);
}
