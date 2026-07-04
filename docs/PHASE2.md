# Phase 2 — Developer Side & Live Data Feeding

Target: a developer/admin side where species data, music, and files are fed
into the system and appear on the live geo atlas — without redeploying the
frontend.

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────────┐
│  Vercel (frontend)  │        │  Railway (backend)               │
│  static SPA + CDN   │        │                                  │
│                     │  GET   │  ┌──────────┐   ┌─────────────┐  │
│  VITE_DATA_URL ─────┼───────▶│  │ Node API │──▶│  Postgres   │  │
│                     │        │  │ (Fastify)│   │  species db │  │
│  images/audio ──────┼───────▶│  └────┬─────┘   └─────────────┘  │
│  (absolute URLs     │        │       │                          │
│   in the data)      │        │  ┌────▼─────────────────────┐    │
│                     │        │  │ Object storage (volume / │    │
│                     │        │  │ R2/S3) images + audio    │    │
└─────────────────────┘        └──────────────────────────────────┘
```

The seam already exists in the frontend (`src/data/atlas.js`):

- The app fetches `VITE_DATA_URL` (default `/data/species.json`) at startup,
  validates the shape, and falls back to bundled data on any failure.
- **Cutover = set `VITE_DATA_URL=https://<railway-app>.up.railway.app/api/species`
  in Vercel project settings and redeploy once.** No code changes.

## API contract

`GET /api/species` must return the document shape in
`public/data/species.json`:

```jsonc
{
  "version": 1,
  "habitats":      { "<id>": { "label", "color", "rgb", "atmos" } },
  "threatClasses": { "<id>": { "label", "color" } },
  "species": [
    {
      "id": "vaquita",              // unique slug (used in URLs: /atlas#vaquita)
      "name": "...", "scientific": "...",
      "status": "Critically Endangered",
      "habitat": "ocean",            // must exist in habitats
      "habitatLabel": "...",
      "lat": 31.0, "lng": -114.5,
      "yearExtinct": null,           // number or null (negative = BCE)
      "population": "...", "threats": ["..."],
      "iconicAction": "...", "description": "...",
      "imageUrl": "https://.../vaquita.jpg",   // absolute URL to stored file
      "imageRemote": "https://...",            // optional secondary source
      "youtube": "https://www.youtube.com/embed/...",
      "threatClass": "trade",        // optional, for the threat lens
      "popCount": 10,                // optional, renders population dots
      "help": ["...", "..."],        // optional, "How to help" section
      "audioUrl": "https://.../vaquita.mp3"    // FUTURE: real species audio
    }
  ]
}
```

Validation rules the frontend enforces (`validate()` in `src/data/atlas.js`):
non-empty `species[]`, every species has `id`/`name`/numeric `lat`/`lng`,
every `habitat` key exists in `habitats`, every habitat has `color` + `rgb`.
Unknown extra fields are ignored — safe to extend.

## Railway setup (when Phase 2 starts)

1. **Postgres** — one `species` table mirroring the JSON fields (JSONB columns
   for `threats`/`help` keep it simple), plus `habitats`/`threat_classes`
   tables or a single JSONB settings row.
2. **API service** — Node + Fastify:
   - `GET /api/species` (public, CORS `Access-Control-Allow-Origin` set to the
     Vercel origin, cache header `max-age=60`)
   - `POST/PUT/DELETE /api/admin/species/:id` (auth: start with a single
     `Authorization: Bearer <ADMIN_TOKEN>` env secret; upgrade to real auth
     if more editors join)
   - `POST /api/admin/upload` → stores image/audio to object storage, returns
     the public URL to paste into the species record
3. **File storage** — Railway volume + static file serving is fine to start;
   Cloudflare R2 (S3-compatible, free egress) when traffic grows.
4. **Admin UI** — either a `/admin` route in this repo (protected client-side
   + token-authed API) or a tiny separate app; forms mirror the schema above.

## Audio note

The takeover's "Listen to Ambient Simulation" button currently plays a
synthesized tone (`src/lib/audio.js`). When a species record carries
`audioUrl`, Phase 2 should play that file instead — the field is already
tolerated by the data layer.

## Scale notes

- Frontend is static on Vercel's CDN — thousands of concurrent users cost
  nothing and need no work.
- The API is read-heavy with one hot endpoint; add `Cache-Control` +
  a CDN in front (or serve the JSON snapshot to R2 on every admin write —
  then the API has zero public read traffic at all).
