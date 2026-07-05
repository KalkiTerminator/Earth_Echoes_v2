# Earth's Echoes — A Living Atlas

A cinematic atlas of vanished and vanishing life. Sixteen species pinned to a
3D globe, a Time Machine that scrubs 12,000 years of extinction history, and a
museum tour that flies you between them — wrapped in a dark, glassmorphic,
sound-designed interface.

Built with **React + Vite + Tailwind CSS 4**, `globe.gl` (atlas globe) and
`three` (landing globe). All UI audio is synthesized at runtime with the Web
Audio API — no audio assets. Globe textures ship from the `three-globe`
package, so the app has no runtime CDN dependencies.

## Run it

```bash
npm install            # also prepares textures + data JSON (postinstall)
npm run fetch-images   # one-time: mirror species photos into public/images
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run preview        # serve the production build
```

## Live site (GitHub Pages)

The app auto-deploys to **https://kalkiterminator.github.io/Earth_Echoes_v2/**
on every push to `main` via `.github/workflows/deploy-pages.yml`. The workflow
mirrors species photos at build time, builds with the `/Earth_Echoes_v2/` base
path, and publishes `dist/` to GitHub Pages with an SPA fallback.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → **Add New… → Project** → import the
   repo. Vercel auto-detects Vite (`npm run build` → `dist/`); `vercel.json`
   in the repo supplies SPA rewrites, caching, and security headers.
3. **Deploy.** Every future `git push` auto-deploys. The free tier serves a
   static CDN site to thousands of users without further work.

Custom domain later: Vercel project → Settings → Domains.

## Data layer (Phase-2 seam)

At startup the app fetches its dataset from
`VITE_DATA_URL` (default: `/data/species.json`, generated from
`src/data/species.js` at build time). The document is validated and, on any
failure, the app falls back to the bundled dataset — the atlas can't go blank
because a data source is down.

**Phase 2** (developer side feeding species/music/files): stand up an API on
Railway that serves the same document shape, then set `VITE_DATA_URL` in
Vercel's environment settings. No frontend code changes. Full blueprint:
[`docs/PHASE2.md`](docs/PHASE2.md).

Species photos are self-hosted from `public/images/species/` (run
`npm run fetch-images` once to mirror them from Wikimedia); if a local image
is missing, the app automatically retries the remote source before showing
its designed fallback.

## Pages

- **`/` — Landing.** Wireframe emerald globe with live HUD telemetry,
  per-letter hero reveal, memorial marquee of the lost, bento species
  spotlights with hover tilt, scroll-triggered stat counters.
- **`/atlas` — The atlas.** Photoreal globe with species pins, habitat
  filtering, and a cinematic intro overlay (skipped when arriving from the
  landing page via `?from=landing`). Deep-link any species with a hash:
  `/atlas#vaquita`.

## Atlas features

- **Time Machine** — scrub from 10,000 BCE to the present; extinct species
  vanish from the globe past their extinction year, and the species index
  strikes them through. Play button animates through time.
- **Museum Tour** — auto-flying camera with cinematic captions and letterbox.
- **Species takeover** — full-screen profile with field notes, threats,
  population dots (one per living individual), how-to-help actions, archive
  footage, postcard PNG export, bookmarking, and share links. Navigate with
  ← → , close with Esc.
- **⌘K command palette** — diacritic-insensitive species search plus quick
  actions.
- **Compare mode** — two species side-by-side.
- **Extinction Ledger** — stats dashboard with a "lost since you were born"
  counter.
- **Guess-the-year quiz** — five rounds on the Time Machine slider.
- **Extinction clock** — counts down to the next estimated global species
  loss (~every 9.6 minutes, UNEP upper-bound estimate).
- **Ambient soundscapes** — generative ocean / forest / tundra / wetland
  audio that crossfades with the habitat theme, plus synthesized hover/click
  sounds with a live waveform toggle.
- **Tweaks panel** — theme (cinematic / editorial / HUD), globe style
  (photoreal / stylized / wireframe), pin style, pin density, threat lens
  with legend, accent override. Persists in `localStorage`.

Reduced-motion preferences are respected throughout, and the layout is
responsive from phones (390px) to wide desktops.

## Project layout

```
src/
  pages/            Landing.jsx, Atlas.jsx
  components/
    atlas/          globe, header, time machine, takeover, tour, palette, …
    landing/        HeroGlobe.jsx
    icons.jsx       inline SVG icon set
  data/species.js   16 species + habitats + threat classes
  lib/              audio synthesis, postcard export, formatting helpers
  styles/           global + landing stylesheets
scripts/
  copy-textures.mjs copies earth textures out of node_modules (postinstall)
```

## Design provenance

This app implements a Claude Design handoff. The original prototype and chat
transcripts live in [`design/`](design/) for reference.
