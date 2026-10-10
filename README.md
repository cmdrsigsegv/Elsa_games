# Elsa's Games

A small collection of puzzle games, built as an installable web app for one
player. Everything runs on the phone; there is no server and no account.

## Working on it

```bash
npm install      # once
npm run dev      # live-reloading dev server, also reachable from a phone on the same Wi-Fi
npm test         # puzzle logic tests
npm run build    # type-check and build into dist/
npm run preview  # serve the built app, including the offline service worker
```

`npm run icons` regenerates the PNG icons after `public/icon.svg` changes.

## Layout

```text
src/
  shell/   screens around the games (home, later settings and statistics)
  kit/     code every game shares
  games/   one folder per game, listed in games/index.ts
  sw.ts    service worker: keeps the app working offline
```

## Publishing

Every push to `main` runs the tests, builds, and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). A failing test blocks the release. Phones
that have the app installed pick up the new version the next time it is
opened after being closed.
