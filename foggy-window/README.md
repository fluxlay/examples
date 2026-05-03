# Foggy Window

Your Mac becomes a foggy window on a rainy night. A distant rain falls over a
sleeping city, the lights breathe and flicker, and a thin veil of condensation
softens the view. As you move your cursor, the scene parallaxes gently — like
leaning toward the window to look out.

![screenshot](./screenshot.jpg)

> Replace `screenshot.jpg` with a still capture before publishing.

## Features

- **Cover-fit background photo** — drop in any night-city image at
  `public/background.jpg`. The shader handles aspect-ratio preservation.
- **Multi-layer mouse parallax** — the background, near rain, and far rain all
  shift at different rates as the cursor moves, giving real depth.
- **Living city lights** — pixels with high luma (street lamps, lit windows)
  pulse with per-cell phases, and ~15% of them flicker like aging neon /
  fluorescent bulbs.
- **Subtle distant rain** — two parallax layers with cycle-randomised on/off
  pattern; never feels mechanical.
- **Soft condensation** — 9-tap Gaussian blur + 5-octave fbm with a vertical
  gradient (top denser than bottom) for a realistic foggy glass.

## Run

Requires the [Fluxlay desktop app](https://fluxlay.com) to be running so that
`useMousePosition` reports system-wide cursor coordinates. Without the app the
parallax falls back to `state.pointer` (browser-local), so it still works while
the cursor is over the canvas.

```bash
pnpm install
pnpm dev          # Fluxlay live preview
pnpm typecheck
pnpm build
pnpm publish      # Upload to fluxlay.com (requires login)
```

## Replacing the background image

Drop a new image at `public/background.jpg`. Any size works thanks to the
cover-fit shader, but for sharpness on Retina displays:

- **Recommended**: 2560 x 1600 or larger
- **Format**: JPEG (smaller) or PNG
- **Subject**: night cityscape with high-contrast point lights — they look most
  striking when they breathe and flicker through the fog

No code changes needed; the file path is the only configuration.

## Custom properties (`fluxlay.yaml`)

| Key                | Type    | Default | Range / step       | Notes                                            |
| ------------------ | ------- | ------- | ------------------ | ------------------------------------------------ |
| `condensation`     | number  | 0.35    | 0 – 1 (0.05)       | Strength of the foggy glass effect.              |
| `rainIntensity`    | number  | 0.6     | 0 – 2 (0.1)        | Density of background rain (behind glass).       |
| `cityLightBreath`  | number  | 0.50    | 0 – 1.2 (0.05)     | Amplitude of the city-light pulsation/flicker.   |

## Architecture

```
Canvas (orthographic, dpr 1–1.5)
├── Background    — full-screen shader: cover-fit photo + parallax + city-light breathing
├── RainLayer     — additive shader: 2 parallax layers, cycle-random on/off rain streaks
└── WindowGlass   — semi-transparent shader: 9-tap blur + fbm condensation
```

`useNormalizedMouse` reconciles the Fluxlay backend cursor (pixel coordinates)
with the R3F `state.pointer` fallback (-1..1) into a single 0..1 vector. A small
LERP smoothing (0.05 per frame) keeps the parallax motion gentle.

The Background shader detects bright pixels (luma > 0.32) and modulates their
brightness with two superimposed sine waves at per-cell phases, plus a fast
flicker on ~15% of the cells.

## Performance

- DPR clamped to `[1, 1.5]`.
- All uniforms updated via refs to avoid React re-renders.
- All `THREE.*` instances allocated in `useMemo` outside the frame loop.
- Tested at 60 fps on a MacBook Pro M1 at 2560 x 1600.

## Known limitations

- Without the Fluxlay desktop app, the parallax only responds while the cursor
  is over the browser viewport (no system-wide cursor tracking).
- The light-breathing effect depends on the source photo: images with a lot of
  ambient bright sky may pulse more than intended (lower `cityLightBreath` to
  compensate, or pick a darker source).
