# Monochrome Time Art

A bold, monochrome particle clock. The time is drawn as a cloud of dots; every minute the particles scatter and re-assemble into the new time through a different motion (explode, swirl, vortex, rain, converge, wave, scatter) while the polarity flips negative/positive for a brutalist edge. In shuffle mode the typeface changes each minute too. Theme (dark/light base), 12/24-hour format, and an optional seconds readout are all configurable.

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
