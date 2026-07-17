# Autonomous Ingestion — Operator Guide

How the self-updating "living atlas" works, what to configure, and how to run it.
Built on the Phase-2 backend (`server/`, Hono + Drizzle + Postgres on Railway);
the public viewer is unchanged and never authenticated.

## What it does

```
Command Center "Run"  →  gather (6 sources, top-N, conflict-flagged)
   →  Claude Haiku SYNTHESIZES a grounded record (never invents hard facts)
   →  Gemini (thinking) VALIDATES it against the raw sources (per-field confidence + flags)
   →  loop until it passes or hits the iteration / budget cap
   →  Gemini generates an illustration only for gaps (labeled AI-generated)
   →  stage a candidate  →  Review queue (or auto-publish above confidence)
   →  Approve  →  publish()  →  live on the globe
```

Everything runs server-side, isolated from the public read path. Agents write
only `species_candidates`; data reaches the globe solely through the existing
validated `publish()` → new snapshot.

## Data sources

| Domain | Sources | Auth |
|---|---|---|
| Taxonomy/identity | GBIF, **Catalogue of Life**, iNaturalist, Wikidata | none (CoL: release key) |
| Conservation status/threats | **IUCN Red List**, iNaturalist, Wikidata, **EDGE** (uniqueness) | IUCN token; EDGE via Firecrawl |
| Coordinates | GBIF occurrences, **OBIS** (marine), iNaturalist (open obs) | none |
| Description/media | Wikimedia, iNaturalist, Wikidata | none (UA required) |
| Audio | Xeno-canto (real recordings) | none |
| Scrape enrichment | Firecrawl / Apify (MCP) | keys, optional |

Coordinates now cross-check three authorities (GBIF + OBIS marine + open iNat
observations; obscured points for threatened taxa are never used). Catalogue of
Life adds an authoritative name backbone (set `INGEST_COL_DATASET` to the current
COL release to enable; unset → skipped). EDGE of Existence adds an evolutionary-
distinctiveness grounding signal via the Firecrawl MCP tier (no-op unless
Firecrawl is configured). Remaining directory sources are staged for later phases.

## LLMs — all on Google Vertex AI (one credit pool)

| Role | Model (default id) | Notes |
|---|---|---|
| Synthesis | `claude-haiku-4-5` (Anthropic on Vertex) | builds the grounded record |
| Validation | `gemini-2.5-flash` (thinking) | independent grounding check |
| Media | `gemini-2.5-flash` | illustration for gaps only |

Override the ids with `INGEST_SYNTH_MODEL` / `INGEST_VALIDATE_MODEL` /
`INGEST_MEDIA_MODEL` to match exactly what your Vertex project exposes.

## Environment variables (Railway service)

**Required to go live (existing Phase-2 vars):**
```
DATABASE_URL        = ${{Postgres.DATABASE_URL}}   # link the Postgres service
BETTER_AUTH_SECRET  = <openssl rand -base64 32>
BETTER_AUTH_URL     = https://api.earthsechoes.org
APP_ORIGIN          = https://earthsechoes.org
COOKIE_DOMAIN       = .earthsechoes.org
ADMIN_EMAILS        = prateek.owner1@gmail.com
STORAGE_DIR         = /data
NODE_ENV            = production
PORT                = 8080
```

**Required for the agents (new):**
```
GOOGLE_VERTEX_PROJECT               = <your-gcp-project-id>
GOOGLE_VERTEX_LOCATION              = us-central1
GOOGLE_APPLICATION_CREDENTIALS_JSON = <service-account JSON, single line>
# Anthropic-on-Vertex is region-gated; set if different from the location above:
GOOGLE_VERTEX_ANTHROPIC_LOCATION    = us-east5
```

**Optional (better data / higher limits / enrichment):**
```
INGEST_COL_DATASET    = <current Catalogue of Life release key on ChecklistBank>
IUCN_TOKEN            = <free non-commercial token, api.iucnredlist.org>
INGEST_CONTACT_EMAIL  = you@example.org   # sent in the User-Agent (polite)
EBIRD_TOKEN, FLICKR_API_KEY, UNSPLASH_ACCESS_KEY, NCBI_API_KEY, NATURESERVE_TOKEN
FIRECRAWL_MCP_URL + FIRECRAWL_API_KEY     # scrape-only enrichment via MCP
APIFY_MCP_URL + APIFY_TOKEN
```

**Cost guardrails (US cents):**
```
INGEST_PER_RUN_CENTS  = 100    # a run aborts before exceeding this
INGEST_MONTHLY_CENTS  = 2000   # scheduling stops once the month crosses this
```

All ingestion vars are **optional at boot** — with none set the server runs
exactly as the Phase-2 API; the agent layer simply reports "not configured".

## Creating the Vertex service account (once)

1. Google Cloud Console → the project holding your credits → **IAM & Admin →
   Service Accounts → Create**.
2. Grant **Vertex AI User** (`roles/aiplatform.user`).
3. **Keys → Add key → JSON** → download.
4. In Vertex AI **Model Garden**, enable access to **Gemini** and **Anthropic
   Claude** (Claude on Vertex requires a one-time "Enable" per model/region).
5. Paste the JSON (minified to one line) as `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   and set `GOOGLE_VERTEX_PROJECT` to the project id.

## Go-live checklist

1. Railway service: **Settings → Source** = `KalkiTerminator/Earth_Echoes_v2`,
   branch `main`, Root Directory `server` (build/start come from `railway.json`).
2. Add the env vars above (at minimum the required block).
3. Deploy. Migrations (incl. the ingestion tables) apply automatically at boot;
   watch logs for `Earth's Echoes API on :8080 (prod)`.
4. `curl https://api.earthsechoes.org/health` → `{"ok":true,"snapshot":...}`.
5. Seed baseline content once: `npm run db:seed` (habitats + the 16 curated
   species + snapshot v1). **Habitats must exist before ingesting** — the
   synthesizer maps each species to an existing habitat id.

## Running an ingestion (Command Center)

1. Sign in with an `ADMIN_EMAILS` address → **Admin → Agents**.
2. **Run now**: set count (e.g. 5), a higher taxon (e.g. `Aves`) *or* explicit
   species names, a confidence threshold, and whether to auto-publish. Click ▶.
3. **Runs**: watch live status + cost.
4. **Review**: inspect each candidate (synthesized record ▸ validator verdict ▸
   sources), then Approve / Edit / Reject. Approve publishes it to the globe.
5. **Audit**: every run and decision is logged.

Save a run as an automation and give it a cron schedule (e.g. `0 6 * * *`) to
make it recurring; the scheduler is advisory-locked so multiple instances won't
double-run a job, and it stops firing once the monthly budget is reached.

## Safety model

- Hard facts (status, coordinates, dates, threats, population) must trace to a
  source payload; the validator rejects unsupported values.
- Review-queue by default; auto-publish is an explicit per-run/per-job toggle
  gated by a confidence threshold.
- Per-run + monthly cost caps, per-provider rate limiting, and response caching.
- Secrets are server-only; media carries license + provenance; AI-generated
  illustrations are labeled; full audit trail.

## First-run notes & known limitations

None of the LLM/MCP calls have been exercised against live services yet — verify
on first deploy:

- **Model ids** (`INGEST_SYNTH_MODEL` / `INGEST_VALIDATE_MODEL` / `INGEST_MEDIA_MODEL`)
  must match exactly what your Vertex project exposes; a wrong id 404s on the
  first call. Override via env.
- **Image generation** (`llm/media.ts`) is the least-certain call and fails soft
  (returns null → species keeps its real photo/fallback). Confirm once you see a
  real Gemini image response.
- **MCP scrape** (`sources/scrape.ts`) uses Firecrawl's `firecrawl_scrape` tool
  name; confirm against your live MCP server, and that your Firecrawl/Apify access
  is a standalone MCP URL (not Bedrock-Agent-only).
- **IUCN** parsing targets the v4 API defensively; confirm against a real token.
- **Drizzle meta:** the ingestion migration (`drizzle/0001`) applies fine at boot
  from the journal + SQL. If you later run `drizzle-kit generate`, first
  regenerate the meta snapshot against a live DB so it doesn't try to re-emit the
  ingestion tables.
- **Scaling:** the scheduler's overlap guard is in-memory (correct for a single
  Railway instance). Running multiple API instances needs the worker-service split
  (a dedicated pooled connection holding a `pg_advisory_lock` for the run).
