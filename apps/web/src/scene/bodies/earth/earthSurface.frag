// Day map lit by the Sun (Lambert), blended across a soft terminator into a dim blue-tinted night side, plus a rim
// glow strongest on the lit limb (earthLook.ts). Output stays below 1, so Earth never blooms.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform sampler2D dayMap;
uniform vec3 sunDirection; // unit, Earth → Sun, scene axes
uniform float twilightWidth;
uniform float dayBrightness;
uniform float nightBrightness;
uniform vec3 nightTint;
uniform vec3 rimColor;
uniform float rimPower;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vToEye;

void main() {
  #include <logdepthbuf_fragment>
  vec3 normal = normalize(vWorldNormal);
  vec3 toEye = normalize(vToEye);
  float sunCosine = dot(normal, sunDirection);
  float daylight = smoothstep(-twilightWidth, twilightWidth, sunCosine);

  vec3 albedo = texture2D(dayMap, vUv).rgb;
  vec3 day = albedo * dayBrightness * max(sunCosine, 0.0);
  float luminance = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
  vec3 night = nightTint * luminance * nightBrightness;

  float rim = pow(1.0 - max(dot(normal, toEye), 0.0), rimPower);
  float rimLit = 0.15 + 0.85 * smoothstep(-0.25, 0.5, sunCosine);
  vec3 color = mix(night, day, daylight) + rimColor * rim * rimLit;
  gl_FragColor = vec4(color, 1.0);
}
