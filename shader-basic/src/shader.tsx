import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * Reusable WebGL2 fragment-shader component for Fluxlay wallpapers.
 *
 * Copy this file into your own wallpaper project — it's intentionally
 * self-contained and has no Fluxlay-runtime dependencies, so you can edit
 * it freely. It exists in this example as a tested starting point, not as
 * part of `@fluxlay/react`.
 *
 * Built-in uniforms (Shadertoy-compatible):
 *   vec3  iResolution  — viewport size in pixels (xy) and pixel aspect (z=1)
 *   float iTime        — seconds since mount
 *   float iTimeDelta   — seconds since last frame
 *   int   iFrame       — frame counter
 *
 * Most Shadertoy shaders can be pasted in unmodified — the component detects
 * `void mainImage(out vec4 fragColor, in vec2 fragCoord)` and auto-wraps it.
 *
 * Note: `iMouse` is NOT auto-supplied. Wallpaper windows are click-through,
 * so native pointer events never fire. If you want mouse input, read the
 * cursor position from `useMousePosition()` in @fluxlay/react and pass it
 * via the `uniforms` prop (see `main.tsx` for an example).
 */

export type ShaderUniformValue =
  | number
  | boolean
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number];

export type ShaderUniforms = Record<string, ShaderUniformValue>;

export type ShaderProps = {
  fragment: string;
  uniforms?: ShaderUniforms;
  /** devicePixelRatio multiplier — lower values reduce GPU load. Default 1. */
  pixelRatio?: number;
  paused?: boolean;
  onError?: (error: string) => void;
  className?: string;
  style?: CSSProperties;
};

const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAGMENT_PREAMBLE = `#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;
uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
`;

const SHADERTOY_FOOTER = `
void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}`;

function buildFragmentSource(userSource: string): string {
  // Strip a user-provided `#version` line — we always inject our own.
  const withoutVersion = userSource.trim().replace(/^\s*#version[^\n]*\n?/, "");
  const isShadertoy = /\bvoid\s+mainImage\s*\(/.test(withoutVersion);
  return isShadertoy ? FRAGMENT_PREAMBLE + withoutVersion + SHADERTOY_FOOTER : FRAGMENT_PREAMBLE + withoutVersion;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to allocate WebGL shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown error";
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to allocate WebGL program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown error";
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }
  return program;
}

function setUniform(gl: WebGL2RenderingContext, location: WebGLUniformLocation, value: ShaderUniformValue) {
  if (typeof value === "number") return gl.uniform1f(location, value);
  if (typeof value === "boolean") return gl.uniform1i(location, value ? 1 : 0);
  if (value.length === 2) return gl.uniform2f(location, value[0], value[1]);
  if (value.length === 3) return gl.uniform3f(location, value[0], value[1], value[2]);
  if (value.length === 4) return gl.uniform4f(location, value[0], value[1], value[2], value[3]);
}

export function Shader({ fragment, uniforms, pixelRatio = 1, paused = false, onError, className, style }: ShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Latest values via refs so prop changes don't restart the render loop.
  const uniformsRef = useRef(uniforms);
  const pausedRef = useRef(paused);
  const pixelRatioRef = useRef(pixelRatio);
  uniformsRef.current = uniforms;
  pausedRef.current = paused;
  pixelRatioRef.current = pixelRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true });
    if (!gl) {
      onError?.("WebGL2 is not supported in this environment");
      return;
    }

    let program: WebGLProgram | null = null;
    let vs: WebGLShader | null = null;
    let fs: WebGLShader | null = null;
    try {
      vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      fs = compileShader(gl, gl.FRAGMENT_SHADER, buildFragmentSource(fragment));
      program = linkProgram(gl, vs, fs);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return;
    }

    // VAO is required in WebGL2 even for attribute-less draws on some drivers.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const uResolution = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uTimeDelta = gl.getUniformLocation(program, "iTimeDelta");
    const uFrame = gl.getUniformLocation(program, "iFrame");

    const customLocations = new Map<string, WebGLUniformLocation | null>();
    const locationFor = (name: string): WebGLUniformLocation | null => {
      const cached = customLocations.get(name);
      if (cached !== undefined) return cached;
      const loc = gl.getUniformLocation(program, name);
      customLocations.set(name, loc);
      return loc;
    };

    const resize = () => {
      const ratio = Math.max(0.1, pixelRatioRef.current) * (window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const start = performance.now();
    let last = start;
    let frame = 0;
    let rafId = 0;

    const draw = () => {
      rafId = requestAnimationFrame(draw);
      if (pausedRef.current) {
        last = performance.now();
        return;
      }
      const now = performance.now();
      const time = (now - start) / 1000;
      const delta = (now - last) / 1000;
      last = now;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);

      if (uResolution) gl.uniform3f(uResolution, canvas.width, canvas.height, 1);
      if (uTime) gl.uniform1f(uTime, time);
      if (uTimeDelta) gl.uniform1f(uTimeDelta, delta);
      if (uFrame) gl.uniform1i(uFrame, frame);

      const current = uniformsRef.current;
      if (current) {
        for (const name of Object.keys(current)) {
          const loc = locationFor(name);
          if (loc) setUniform(gl, loc, current[name]);
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame += 1;
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      if (program) gl.deleteProgram(program);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (vao) gl.deleteVertexArray(vao);
    };
  }, [fragment, onError]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
