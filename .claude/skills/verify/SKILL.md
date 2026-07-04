---
name: verify
description: Build, launch, and drive Earth's Echoes (Vite + React SPA with WebGL globes) to verify changes at the browser surface.
---

# Verifying Earth's Echoes

## Build & launch

```bash
npm install                       # postinstall copies globe textures to public/textures
npm run build                     # must succeed before preview
npm run preview -- --port 4173 --strictPort   # serves dist/ with SPA fallback
```

Dev server alternative: `npm run dev -- --port 5174`. If you change
dependencies, add `--force` — Vite's optimizer caches stale pre-bundles in
`node_modules/.vite` (this bit us with a dual-three.js bug once).

## Drive it (headless Chromium + Playwright)

Chromium lives at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
(pass as `executablePath`; do NOT run `playwright install`). Install
`playwright` in a scratch dir, not the repo.

Flows worth driving:
- `/` landing: hero globe renders (canvas non-black), scroll to `#spotlights`
  and `.stats` for reveal/counter animations, click `.ghost-btn` → `/atlas`.
- `/atlas?from=landing` skips the intro; bare `/atlas` shows it (click
  center-bottom to enter). `/atlas#<species-id>` deep-links a takeover.
- Pins: `.pin` elements exist (9 at year=Present, more in the past). Click
  one (or a species-index rail button — pins move with rotation, the rail is
  stable) → takeover opens. ← → navigates, Esc closes.
- Time Machine: `input.ee-range` fill "1500" → extinct-by-then pins appear,
  index strikethroughs update.
- `Control+k` palette (search is diacritic-folded: "kakapo" must find
  Kākāpō), Ledger button, Compare, Museum Tour, quiz, Tweaks panel
  (wireframe globe style + threat lens are good visual probes).
- Mobile: 390×844 viewport; header collapses, takeover becomes a single
  scrolling column.

## Environment gotchas (not app bugs)

- This sandbox blocks fonts.googleapis.com, wsrv.nl (Wikipedia photos), and
  YouTube — expect `ERR_CERT_AUTHORITY_INVALID` / QUIC console noise and
  image fallbacks (truncated name chips in pins, gradient panels in
  takeovers). Real browsers load them.
- Globe textures are LOCAL (`/textures/*.jpg`) — if the globe is black,
  check `public/textures/` exists (run `node scripts/copy-textures.mjs`).
- WebGL works headless; screenshots capture the globe fine.

## Known load-bearing details

- `three` must dedupe to the version globe.gl uses (`npm ls three` → one
  version) or globe.gl's isBehindGlobe crashes and pins never render.
- Globe is created with `waitForGlobeReady: false` so a stalled texture
  can't hide the whole scene.
- The globe mount has `isolation: isolate` — globe.gl gives pin elements
  huge z-indexes that would otherwise paint above modals.
- CSS colors from `--accent-rgb` (space-separated) must use
  `rgb(R G B / a)` syntax, never `rgba(R G B, a)` (invalid, silently drops
  the declaration).
