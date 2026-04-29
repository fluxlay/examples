# Fluxlay Examples

[日本語](./README.ja.md) | **English**

Official examples for building live wallpapers with [Fluxlay](https://fluxlay.com). Each directory is a standalone project that works directly with the `@fluxlay/cli` `dev` / `build` / `publish` commands.

## Examples

| Example | Description | APIs used |
| --- | --- | --- |
| [hello-world](./hello-world) | Minimal template — a starting point for new projects. | — |
| [mouse-follower](./mouse-follower) | Star particles drifting toward your cursor with React Spring physics. | `useMousePosition` |
| [gradient-waves](./gradient-waves) | Layered gradient waves with time-of-day color shifts. | `useMousePosition` |
| [particle-flow-field](./particle-flow-field) | Perlin-noise flow field with painterly particle trails. | `useMousePosition` |
| [glass-cube](./glass-cube) | Refractive glass cube rendered with React Three Fiber. | `useMousePosition` |
| [audio-visualizer](./audio-visualizer) | Circular frequency bars with now-playing media metadata. | Audio capture, Media metadata, Custom properties |
| [matrix-rain](./matrix-rain) | Matrix-style digital rain reactive to CPU load. | `useSystemMonitor` |
| [system-monitor](./system-monitor) | Cyberpunk HUD displaying CPU / memory / network metrics. | `useSystemMonitor` |
| [run-command](./run-command) | Desktop dashboard powered by `macchina`, `pmset`, `curl`. | `shell`, `network` |

## Usage

In any example directory:

```sh
cd <example>
pnpm install
pnpm dev       # Dev server with HMR, paired with the Fluxlay app
pnpm build     # Produces wallpaper.fluxlay
pnpm publish   # Publish to the Fluxlay store (requires login)
```

> [!NOTE]
> The dev server requires the [Fluxlay desktop app](https://fluxlay.com) and authentication via `fluxlay login`.

## Requirements

- Node.js 20+ / pnpm 10+
- macOS or Windows (per Fluxlay's supported platforms)
- `run-command` additionally requires `macchina`, `curl`, and `jq`

## Project structure

Every example follows the same layout:

```
<example>/
├── fluxlay.yaml      # Wallpaper manifest (name / slug / kind: web / properties, etc.)
├── package.json      # Depends on @fluxlay/cli, @fluxlay/vite, @fluxlay/react
├── vite.config.ts    # Configures the @fluxlay/vite plugin
├── index.html
└── src/main.tsx      # Wallpaper entry point
```

See the [`@fluxlay/cli` README](https://github.com/fluxlay/cli) for the full `fluxlay.yaml` specification.

## License

Each example is provided under the [MIT License](./LICENSE). Feel free to fork and modify them to build your own wallpapers.
