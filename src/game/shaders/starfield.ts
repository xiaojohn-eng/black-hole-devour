export const starfieldVertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
varying float vPhase;
varying float vBright;

void main() {
  vPhase = aPhase;
  vBright = aSize;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (280.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`

export const starfieldFragment = /* glsl */ `
uniform float uTime;
varying float vPhase;
varying float vBright;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float twinkle = 0.65 + 0.35 * sin(uTime * 2.2 + vPhase * 6.28);
  float alpha = smoothstep(0.5, 0.0, d) * twinkle;
  vec3 col = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.95, 0.85), fract(vPhase * 3.7));
  gl_FragColor = vec4(col * (0.6 + vBright * 0.15), alpha);
}
`
