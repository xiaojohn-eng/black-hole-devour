export const accretionDiskVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const accretionDiskFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColorHot;
uniform vec3 uColorCool;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vWorldPos;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float r = length(uv);
  float angle = atan(uv.y, uv.x);

  // Soft ring mask
  float inner = 0.28;
  float outer = 1.0;
  float ring = smoothstep(inner, inner + 0.12, r) * (1.0 - smoothstep(outer - 0.25, outer, r));

  // Spiral accretion flow
  float spiral = angle * 2.5 - uTime * 1.8 + r * 8.0;
  float flow = fbm(vec2(spiral * 0.4, r * 6.0 - uTime * 0.6));
  float bands = 0.55 + 0.45 * sin(spiral + flow * 4.0);

  float heat = pow(1.0 - smoothstep(inner, 0.75, r), 1.4);
  vec3 col = mix(uColorCool, uColorHot, heat * bands);
  col += uColorHot * flow * 0.35 * heat;

  float alpha = ring * bands * uIntensity;
  alpha *= 0.75 + 0.25 * flow;

  // Soft glow falloff
  alpha *= smoothstep(0.0, 0.2, r);

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`
