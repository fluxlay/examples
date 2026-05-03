# Fluxlay Examples

[日本語](./README.ja.md) | **English**

Official examples for building live wallpapers with [Fluxlay](https://fluxlay.com). Each directory is a standalone project that works directly with the `@fluxlay/cli` `dev` / `build` / `publish` commands.

📖 **Documentation:** [Getting Started](https://fluxlay.com/docs/developer/tutorials/getting-started) · [CLI Reference](https://fluxlay.com/docs/developer/reference/cli/commands) · [Manifest Reference](https://fluxlay.com/docs/developer/reference/cli/manifest) · [SDK Reference](https://fluxlay.com/docs/developer/reference/sdk/use-mouse-position)

## Examples

| Example | Description | APIs used |
| --- | --- | --- |
| [hello-world](./hello-world) | Minimal template — a starting point for new projects. | — |
| [mouse-follower](./mouse-follower) | Star particles drifting toward your cursor with React Spring physics. | [`useMousePosition`](https://fluxlay.com/docs/developer/reference/sdk/use-mouse-position) |
| [gradient-waves](./gradient-waves) | Layered gradient waves with time-of-day color shifts. | [`useMousePosition`](https://fluxlay.com/docs/developer/reference/sdk/use-mouse-position) |
| [particle-flow-field](./particle-flow-field) | Perlin-noise flow field with painterly particle trails. | [`useMousePosition`](https://fluxlay.com/docs/developer/reference/sdk/use-mouse-position) |
| [glass-cube](./glass-cube) | Refractive glass cube rendered with React Three Fiber. | [`useMousePosition`](https://fluxlay.com/docs/developer/reference/sdk/use-mouse-position) |
| [audio-visualizer](./audio-visualizer) | Circular frequency bars with now-playing media metadata. | [`useAudio`](https://fluxlay.com/docs/developer/reference/sdk/use-audio), [`useMediaMetadata`](https://fluxlay.com/docs/developer/reference/sdk/use-media-metadata), [`useProperties`](https://fluxlay.com/docs/developer/reference/sdk/use-properties) |
| [matrix-rain](./matrix-rain) | Matrix-style digital rain reactive to CPU load. | [`useSystemMonitor`](https://fluxlay.com/docs/developer/reference/sdk/use-system-monitor) |
| [system-monitor](./system-monitor) | Cyberpunk HUD displaying CPU / memory / network metrics. | [`useSystemMonitor`](https://fluxlay.com/docs/developer/reference/sdk/use-system-monitor) |
| [monochrome-monitor](./monochrome-monitor) | Minimal black-and-white system HUD with a bottom-edge audio spectrum strip and dark/light theme switch. | [`useSystemMonitor`](https://fluxlay.com/docs/developer/reference/sdk/use-system-monitor), [`useAudio`](https://fluxlay.com/docs/developer/reference/sdk/use-audio), [`useMediaMetadata`](https://fluxlay.com/docs/developer/reference/sdk/use-media-metadata), [`useProperties`](https://fluxlay.com/docs/developer/reference/sdk/use-properties) |
| [run-command](./run-command) | Desktop dashboard powered by `macchina`, `pmset`, `curl`. | [`useShell`](https://fluxlay.com/docs/developer/reference/sdk/use-shell), [`shell` / `network` manifest](https://fluxlay.com/docs/developer/reference/cli/manifest) |
| [dev-dashboard](./dev-dashboard) | Developer dashboard with GitHub PRs, Google Calendar, and a Pomodoro timer. Demonstrates `proxiedFetch`, `openUrl`, `notify`, and Mimo-driven clicks. | [`proxiedFetch`](https://fluxlay.com/docs/developer/reference/sdk/proxied-fetch), [`openUrl`](https://fluxlay.com/docs/developer/reference/sdk/open-url), [`notify`](https://fluxlay.com/docs/developer/reference/sdk/notify), [`MimoProvider`](https://fluxlay.com/docs/developer/reference/sdk/mimo-provider), [`useProperties`](https://fluxlay.com/docs/developer/reference/sdk/use-properties) |

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
> The dev server requires the [Fluxlay desktop app](https://fluxlay.com) and authentication via `fluxlay login`. See the [getting started guide](https://fluxlay.com/docs/developer/tutorials/getting-started) for the full walkthrough.

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

See the [manifest reference](https://fluxlay.com/docs/developer/reference/cli/manifest) for the full `fluxlay.yaml` specification, and the [Vite plugin reference](https://fluxlay.com/docs/developer/reference/vite-plugin) for `@fluxlay/vite` options.

## License

Each example is provided under the [MIT License](./LICENSE). Feel free to fork and modify them to build your own wallpapers.
