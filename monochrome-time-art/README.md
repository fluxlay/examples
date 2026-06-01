# Monochrome Time Art

A minimal, artful black-and-white clock. Every minute the time re-renders through a different animation — flip, slide, dissolve, blur, glitch, fall, scale — and (in shuffle mode) a different Google Font, so the gesture never repeats. Theme (dark/light), 12/24-hour format, and an optional seconds readout are all configurable.

> Examples below use `pnpm`. Substitute `npm`, `bun`, or `yarn` as you prefer.

## Develop

```sh
npm install
npm run dev
```

The Fluxlay desktop app must be running. It will hot-reload as you edit files.

## Build

```sh
npm run build
```

Produces `wallpaper.fluxlay`.

## Publish

```sh
npx fluxlay login   # one-time
npm run publish
```
