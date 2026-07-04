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
npm install     # also copies globe textures into public/textures
npm run dev     # http://localhost:5173
npm run build   # production build in dist/
npm run preview # serve the production build
```

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
