# shader-basic

A Shadertoy-compatible GLSL fragment shader running fullscreen as a Fluxlay wallpaper. Use this as a starting template for shader-based wallpapers.

## What's in here

- **`src/shader.tsx`** — a small (~200 line) reusable `<Shader />` component that wraps WebGL2 and injects the standard Shadertoy uniforms. It's intentionally **not** part of `@fluxlay/react` — copy it into your project and edit it freely. The Fluxlay SDK is scoped to runtime-bridging APIs; pure browser-API helpers like this live as templates so you can swap in libraries like [`ogl`](https://github.com/oframe/ogl), [`twgl`](https://twgljs.org/), or [Three.js](https://threejs.org/) when you outgrow it.
- **`src/main.tsx`** — a sample plasma shader showing how to use `<Shader />`.

## Built-in uniforms

Shadertoy-compatible — paste most Shadertoy shaders in unmodified.

| Uniform       | Type    | Description                                         |
| ------------- | ------- | --------------------------------------------------- |
| `iResolution` | `vec3`  | Viewport size in pixels (xy) and pixel aspect (z=1) |
| `iTime`       | `float` | Seconds since mount                                 |
| `iTimeDelta`  | `float` | Seconds since last frame                            |
| `iFrame`      | `int`   | Frame counter                                       |

### Why no `iMouse`?

Wallpaper windows are **click-through** — native pointer events (`pointermove`, `pointerdown`) never reach the wallpaper, so the usual Shadertoy `iMouse` strategy of listening to canvas events doesn't work.

Use `useMousePosition()` from `@fluxlay/react` to read the cursor from the Fluxlay backend, then pass it to the shader as a custom uniform. `main.tsx` shows the pattern.

## Custom uniforms

Pass via the `uniforms` prop and re-upload each frame. `number` → `float`, `boolean` → `bool`, 2/3/4-tuples → `vec2`/`vec3`/`vec4`. Declare them in the shader with matching names and types.

```tsx
<Shader fragment={src} uniforms={{ speed: 1.5, tint: [1, 0.5, 0.2] }} />
```

```glsl
uniform float speed;
uniform vec3 tint;
```

## Run

```sh
pnpm install
pnpm dev       # paired with the Fluxlay desktop app
pnpm build     # produces wallpaper.fluxlay
```
