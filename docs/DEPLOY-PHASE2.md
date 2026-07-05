# Phase 2 Deployment — Backend, Accounts, Admin & Analytics

This guide takes Earth's Echoes from the static GitHub Pages site to a
production stack: **frontend on Vercel**, **API + Postgres on Railway**, a
custom domain, user accounts, an admin CMS, and analytics.

Nothing here changes how the atlas renders — the frontend still fetches
`VITE_DATA_URL`, validates it, and falls back to bundled data if the API is
down. You can roll this out incrementally; each phase leaves a working site.

---

## Architecture

```
earthsechoes.com            (Vercel — static SPA + CDN)
  │  GET /api/species        → VITE_DATA_URL
  │  /api/auth,/me,/events    → VITE_API_URL, first-party cookies
  ▼
api.earthsechoes.com        (Railway — Hono API, Node 22)
  ├─ Better Auth (email+password; Google-ready) → sessions in Postgres
  ├─ Drizzle ORM → Railway Postgres
  └─ /files/*  → uploaded media on a Railway volume
```

`earthsechoes.com` is a placeholder — substitute the domain you buy. App and
API must share a registrable domain (app at the apex/`www`, API at `api.`) so
the session cookie (`Domain=.earthsechoes.com`) is first-party on both.

---

## Prerequisites

- The domain you'll buy (any registrar).
- A Railway account (premium) and a Vercel account.
- This repo pushed to GitHub (already the case).

---

## Phase 0 — Frontend to Vercel (no code changes)

1. **Vercel → Add New → Project → import `KalkiTerminator/Earth_Echoes_v2`.**
   It auto-detects Vite (`npm run build` → `dist/`). `.vercelignore` excludes
   `server/`. Deploy — you get a `*.vercel.app` URL that works immediately
   (still static data; `VITE_API_URL` unset ⇒ account layer dormant).
2. **Buy the domain.** In Vercel → Project → Settings → Domains, add
   `earthsechoes.com` and `www.earthsechoes.com`; Vercel shows the exact DNS
   records (apex `A 76.76.21.21`, `www CNAME cname.vercel-dns.com`). Add them
   at your registrar.

GitHub Pages keeps serving in parallel until cutover (Phase 5).

---

## Phase 1 — API + Postgres on Railway

1. **New Railway project → Add Postgres.** Railway injects `DATABASE_URL` into
   services in the project.
2. **Add a service from this GitHub repo.** In the service settings:
   - **Root Directory:** `server`
   - **Build:** `npm ci && npm run build`  ·  **Start:** `node dist/index.js`
     (also declared in `server/railway.json`)
   - **Healthcheck path:** `/health`
3. **Add a Volume** mounted at `/data` (for uploaded media).
4. **Service Variables:**
   | Variable | Value |
   |---|---|
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | `https://api.earthsechoes.com` |
   | `APP_ORIGIN` | `https://earthsechoes.com` |
   | `COOKIE_DOMAIN` | `.earthsechoes.com` |
   | `ADMIN_EMAILS` | `prateek.owner1@gmail.com` |
   | `STORAGE_DIR` | `/data` |
   | `NODE_ENV` | `production` |

   `DATABASE_URL` and `PORT` are injected by Railway — don't set them.
5. **Custom domain:** service → Settings → Networking → Custom Domain →
   `api.earthsechoes.com`. Railway shows a `CNAME` target and provisions TLS;
   add the record at your registrar.
6. **Migrate + seed** (first deploy only). Migrations run automatically at
   boot. To seed the 16 species from the bundled dataset, run once from the
   Railway service shell (or locally with the prod `DATABASE_URL`):
   ```bash
   npm run db:seed          # publishes snapshot v1
   ```
   Set `SEED_ASSET_ORIGIN=https://earthsechoes.com` if you've moved the
   species images to the app; otherwise it defaults to the GitHub Pages URLs.
7. **Point the frontend at the API.** In Vercel → Settings → Environment
   Variables (Production):
   ```
   VITE_DATA_URL = https://api.earthsechoes.com/api/species
   VITE_API_URL  = https://api.earthsechoes.com
   ```
   Redeploy. The atlas now reads live data; accounts/admin/analytics activate.

**Verify:** `curl https://api.earthsechoes.com/api/species` returns the doc
with an `ETag`; stop the Railway service and reload the site — the atlas still
renders from bundled data (console: `[atlas] using bundled dataset`).

---

## Phase 2–4 — already in the code

Once Phase 1 is live, accounts, sync, the admin CMS, and analytics are all
active — no further deploys needed:

- **Accounts & sync:** the header shows **Sign in**; signing up syncs
  bookmarks / quiz scores / birth year / tweaks across devices. Anonymous
  visitors keep working on `localStorage`.
- **Admin CMS:** sign in with an `ADMIN_EMAILS` address → account menu →
  **Admin panel** (`/admin`). Edit species, upload images/audio, manage
  habitats/threats, then **Publish live** — the change reaches the atlas within
  the 60 s snapshot-cache window with no redeploy. Invalid drafts are blocked
  with the specific problem.
- **Analytics:** `/admin/analytics` — total users, DAU, signups, most-viewed
  species, quiz stats, recent users. A nightly job (04:00 UTC) rolls up daily
  metrics and enforces 90-day raw-event retention.

---

## Phase 5 — Cutover

1. Point anyone on the old GitHub Pages URL to the new domain: the
   `deploy-pages.yml` workflow can be replaced with a static page that
   `<meta http-equiv="refresh">`-redirects to `https://earthsechoes.com`, or
   disable GitHub Pages once the domain has propagated.
2. Optional hardening: put Cloudflare in front of `api.` (the `s-maxage=300`
   on `/api/species` makes it edge-cacheable), enable Railway Postgres
   backups, and add error monitoring (Sentry) to the API and the frontend
   `ErrorBoundary`.

---

## Later: Google sign-in

Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Railway (OAuth redirect
`https://api.earthsechoes.com/api/auth/callback/google`). The client already
loads the provider when configured; add a "Continue with Google" button to
`AuthModal` calling `authClient.signIn.social({ provider: "google" })`.

## Later: media on Cloudflare R2

When you need more than one API replica (Railway volumes attach to a single
instance) or media grows large, implement the R2 branch in
`server/src/lib/storage.ts` (S3-compatible `PutObject`) and set the R2 env
vars. Nothing else changes — `save()` is the only surface that touches disk.

---

## Local development

```bash
# 1. Postgres (any local instance); create the DB
createdb earths_echoes

# 2. API
cd server
cp .env.example .env         # adjust DATABASE_URL
npm install
npm run db:generate          # (only after schema changes)
npm run db:seed              # migrate + seed + publish v1
npm run dev                  # http://localhost:8787

# 3. Frontend (repo root), pointed at the local API
VITE_API_URL=http://localhost:8787 \
VITE_DATA_URL=http://localhost:8787/api/species \
npm run dev                  # http://localhost:5173
```

Without the `VITE_*` vars the frontend runs exactly as before — bundled data,
no accounts — so day-to-day UI work needs no backend.
