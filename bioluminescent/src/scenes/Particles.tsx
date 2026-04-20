import { useMousePosition } from "@fluxlay/react";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { approachRate, type EnvTarget, lerpScalar, lerpVec3 } from "../environment";
import { COLOR_FIELD_GLSL } from "./color-field";
import { ATLAS_COLS, ATLAS_ROWS, getSpriteAtlas } from "./sprite-atlas";

// Target: living bioluminescent cells — each pulses individually, drifts
// with a flowing aurora, colours wave with the field. Additive blending
// so every cell glows against the dark deep-sea backdrop.
const COUNT = 28000;
const CLUSTER_COUNT = 18;

const vert =
  /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uSunTint;
uniform float uAmbient;
uniform float uAgitation;

attribute vec3 aSeed;
attribute float aScale;
attribute vec3 aTint;
attribute vec2 aSpriteCell;
attribute float aRotation;

varying vec3 vColor;
varying float vAlpha;
varying vec2 vSpriteCell;
varying float vRotation;
` +
  COLOR_FIELD_GLSL +
  /* glsl */ `
void main() {
  vec3 pos = position;
  float t = uTime * 0.2;
  float sx = aSeed.x * 6.2831;

  float stir = 1.0 + uAgitation * 0.8;
  pos.x += sin(t * 0.8 + sx) * 0.25 * stir;
  pos.z += cos(t * 0.6 + sx * 0.7) * 0.2 * stir;
  pos.y += t * (0.35 + aSeed.z * 0.45);
  pos.y = mod(pos.y + 12.0, 24.0) - 12.0;

  vec3 flowSample = colorField(pos.xy * 0.35, uTime * 0.45);
  vec2 flow = vec2(flowSample.r - flowSample.g, flowSample.b - flowSample.r) * 3.2;
  pos.xy += flow * (1.0 + uAgitation * 0.6);

  // cursor motion is integrated via a per-particle velocity on the CPU
  // side (mutates position + velocity buffers), so nothing to do here

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float pulsePhase = sin(uTime * (0.4 + aSeed.x * 0.6) + aSeed.y * 6.2831);
  float sizePulse = 1.0 + pulsePhase * 0.08;
  float brightPulse = 1.0 + pulsePhase * 0.12;

  float sizeMul = uSize * aScale * uPixelRatio * sizePulse;
  float closeness = smoothstep(-7.0, -1.5, mvPosition.z);
  float bokehBoost = 1.0 + closeness * 0.4;
  gl_PointSize = clamp(sizeMul * (150.0 / -mvPosition.z) * bokehBoost, 1.2, 40.0);

  vec3 field = colorField(pos.xy, uTime);
  float bright = (aTint.r + aTint.g + aTint.b) * 0.333;
  vec3 base = (aTint * 1.4 + field * (0.4 + bright * 2.0)) * brightPulse;

  // surface sun bleed — particles near the top catch a hint of the day's
  // sun tint; deeper ones stay purely bioluminescent
  float surface = smoothstep(-8.0, 10.0, pos.y);
  vec3 surfaceMix = vec3(1.0) + uSunTint * 0.3 * surface * uAmbient;
  vColor = base * surfaceMix * mix(0.55, 0.95, uAmbient);

  float depthFade = smoothstep(-16.0, -2.0, mvPosition.z);
  depthFade = pow(depthFade, 1.2);
  vAlpha = depthFade * (0.82 + aSeed.y * 0.18);
  vSpriteCell = aSpriteCell;
  vRotation = aRotation;
}
`;

const frag = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;

varying vec3 vColor;
varying float vAlpha;
varying vec2 vSpriteCell;
varying float vRotation;

void main() {
  vec2 local = gl_PointCoord - 0.5;
  float c = cos(vRotation);
  float s = sin(vRotation);
  local = vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  vec2 pc = local + 0.5;
  if (pc.x < 0.0 || pc.x > 1.0 || pc.y < 0.0 || pc.y > 1.0) discard;

  vec2 uv = (vSpriteCell + pc) / uAtlasGrid;
  vec4 tex = texture2D(uAtlas, uv);
  if (tex.a < 0.02) discard;

  vec2 nxy = (pc - 0.5) * 2.0;
  float nz = sqrt(max(0.0, 1.0 - dot(nxy, nxy)));
  vec3 n = vec3(nxy, nz);
  vec3 lightDir = normalize(vec3(-0.55, -0.6, 0.55));
  float diffuse = max(0.0, dot(n, lightDir));
  vec3 halfV = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(0.0, dot(n, halfV)), 28.0);

  float alpha = tex.a * vAlpha;
  vec3 col = vColor * tex.rgb * (0.78 + diffuse * 0.44)
           + vec3(1.0) * spec * 0.7 * tex.a;
  gl_FragColor = vec4(col, alpha);
}
`;

function gaussian() {
  const u = Math.max(1e-6, Math.random());
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type Props = { env: EnvTarget };

export function Particles({ env }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouse = useMousePosition();
  const smoothedMouse = useRef(new THREE.Vector2());
  const lastWorldMouse = useRef(new THREE.Vector2());
  const lastMouseInit = useRef(false);
  const mouseVel = useRef(new THREE.Vector2());
  const atlas = useMemo(() => getSpriteAtlas(), []);
  // per-particle 2D velocity persists between frames so cursor forces
  // decay through water-drag instead of jumping instantly with the mouse
  const velocities = useMemo(() => new Float32Array(COUNT * 2), []);
  const activeRef = useRef(false);

  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const tints = new Float32Array(COUNT * 3);
    const spriteCells = new Float32Array(COUNT * 2);
    const rotations = new Float32Array(COUNT);

    const palettes = [
      [0.15, 0.28, 0.24],
      [0.22, 0.38, 0.32],
      [0.32, 0.5, 0.44],
      [0.5, 0.68, 0.58],
      [0.38, 0.58, 0.78],
      [0.92, 0.96, 1.0],
    ];

    const spriteWeights = [
      { idx: 1, w: 0.38 },
      { idx: 0, w: 0.2 },
      { idx: 5, w: 0.18 },
      { idx: 2, w: 0.12 },
      { idx: 4, w: 0.08 },
      { idx: 3, w: 0.04 },
    ];
    const pickSprite = () => {
      const r = Math.random();
      let acc = 0;
      for (const entry of spriteWeights) {
        acc += entry.w;
        if (r < acc) return entry.idx;
      }
      return 0;
    };

    const clusters: { x: number; y: number; z: number; r: number }[] = [];
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const tight = Math.random() < 0.5;
      clusters.push({
        x: (Math.random() - 0.5) * 24,
        y: (Math.random() - 0.5) * 16,
        z: (Math.random() - 0.5) * 10 - 2,
        r: tight ? 0.7 + Math.random() * 1.2 : 2.4 + Math.random() * 3.0,
      });
    }

    for (let i = 0; i < COUNT; i++) {
      if (Math.random() < 0.85) {
        const c = clusters[Math.floor(Math.random() * clusters.length)];
        const r = c.r * Math.abs(gaussian()) * 0.55;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = c.x + r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = c.y + r * Math.sin(phi) * Math.sin(theta) * 1.2;
        positions[i * 3 + 2] = c.z + r * Math.cos(phi) * 0.65;
      } else {
        positions[i * 3] = (Math.random() - 0.5) * 28;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
      }

      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();

      const r = Math.random();
      scales[i] = 0.28 + r ** 3.0 * 2.4;

      const pick = Math.random();
      let idx = 0;
      if (pick < 0.45) idx = 0;
      else if (pick < 0.72) idx = 1;
      else if (pick < 0.88) idx = 2;
      else if (pick < 0.95) idx = 3;
      else if (pick < 0.99) idx = 4;
      else idx = 5;
      const p = palettes[idx];
      const jitter = 0.06;
      tints[i * 3] = Math.max(0, p[0] + (Math.random() - 0.5) * jitter);
      tints[i * 3 + 1] = Math.max(0, p[1] + (Math.random() - 0.5) * jitter);
      tints[i * 3 + 2] = Math.max(0, p[2] + (Math.random() - 0.5) * jitter);

      const spriteIdx = pickSprite();
      spriteCells[i * 2] = spriteIdx % ATLAS_COLS;
      spriteCells[i * 2 + 1] = Math.floor(spriteIdx / ATLAS_COLS);
      rotations[i] = Math.random() * Math.PI * 2;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    g.setAttribute("aTint", new THREE.BufferAttribute(tints, 3));
    g.setAttribute("aSpriteCell", new THREE.BufferAttribute(spriteCells, 2));
    g.setAttribute("aRotation", new THREE.BufferAttribute(rotations, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 1.95 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
      uAtlas: { value: atlas },
      uAtlasGrid: { value: new THREE.Vector2(ATLAS_COLS, ATLAS_ROWS) },
      uSunTint: { value: new THREE.Vector3(0.3, 0.52, 0.5) },
      uAmbient: { value: 0.7 },
      uAgitation: { value: 0 },
    }),
    [atlas],
  );

  useFrame((state, delta) => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;

    const envK = approachRate(delta, 0.6);
    const sunTint = m.uniforms.uSunTint.value as THREE.Vector3;
    const sunArr: [number, number, number] = [sunTint.x, sunTint.y, sunTint.z];
    lerpVec3(sunArr, env.sunTint, envK);
    sunTint.set(sunArr[0], sunArr[1], sunArr[2]);
    m.uniforms.uAmbient.value = lerpScalar(m.uniforms.uAmbient.value, env.light, envK);
    m.uniforms.uAgitation.value = lerpScalar(m.uniforms.uAgitation.value, env.agitation, envK);

    // frame-rate independent smoothing — half-life ≈ 35ms so the scene
    // tracks the cursor tightly while still filtering OS-level jitter
    const posK = 1 - Math.exp(-delta * 20);
    smoothedMouse.current.x += (mouse.x - smoothedMouse.current.x) * posK;
    smoothedMouse.current.y += (mouse.y - smoothedMouse.current.y) * posK;

    const mwx = smoothedMouse.current.x * 8.0;
    const mwy = smoothedMouse.current.y * 5.5;

    // estimate cursor velocity in world units / second, low-passed itself
    // so a stationary cursor produces exactly zero force
    if (lastMouseInit.current && delta > 0) {
      const rawVx = (mwx - lastWorldMouse.current.x) / delta;
      const rawVy = (mwy - lastWorldMouse.current.y) / delta;
      const velK = 1 - Math.exp(-delta * 15);
      mouseVel.current.x += (rawVx - mouseVel.current.x) * velK;
      mouseVel.current.y += (rawVy - mouseVel.current.y) * velK;
    }
    lastWorldMouse.current.set(mwx, mwy);
    lastMouseInit.current = true;

    const mvx = mouseVel.current.x;
    const mvy = mouseVel.current.y;
    const hasMotion = Math.abs(mvx) > 0.05 || Math.abs(mvy) > 0.05;
    if (!hasMotion && !activeRef.current) return;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const seeds = (geometry.attributes.aSeed as THREE.BufferAttribute).array as Float32Array;
    const vel = velocities;

    // tight focal radius — fingertip-sized pool around the cursor
    const R = 1.0;
    const R2 = R * R;
    // continuous-force coefficient: dv = mouseVel * mask * personal * FORCE * dt
    const FORCE = 1.6;
    const damp = 0.1 ** delta;
    const VMAX = 6.0;

    let anyActive = false;
    let dirty = false;
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const i2 = i * 2;
      let vx = vel[i2];
      let vy = vel[i2 + 1];

      if (hasMotion) {
        const dx = positions[i3] - mwx;
        const dy = positions[i3 + 1] - mwy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= R2) {
          const t = 1 - d2 / R2;
          // cubic falloff concentrates the effect near the cursor core,
          // so small precise motions push a small precise cluster
          const mask = t * t * t;
          const personal = 0.45 + seeds[i3] * 1.1;
          const coeff = mask * personal * FORCE * delta;
          vx += mvx * coeff;
          vy += mvy * coeff;
          if (vx > VMAX) vx = VMAX;
          else if (vx < -VMAX) vx = -VMAX;
          if (vy > VMAX) vy = VMAX;
          else if (vy < -VMAX) vy = -VMAX;
        }
      }

      if (vx === 0 && vy === 0) continue;

      positions[i3] += vx * delta;
      positions[i3 + 1] += vy * delta;
      if (positions[i3] > 14) positions[i3] -= 28;
      else if (positions[i3] < -14) positions[i3] += 28;
      if (positions[i3 + 1] > 12) positions[i3 + 1] -= 24;
      else if (positions[i3 + 1] < -12) positions[i3 + 1] += 24;
      dirty = true;

      vx *= damp;
      vy *= damp;
      if (Math.abs(vx) < 0.003 && Math.abs(vy) < 0.003) {
        vx = 0;
        vy = 0;
      } else {
        anyActive = true;
      }
      vel[i2] = vx;
      vel[i2 + 1] = vy;
    }
    activeRef.current = anyActive;
    if (dirty) posAttr.needsUpdate = true;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
