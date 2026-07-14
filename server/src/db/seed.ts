// Seeds content tables from the bundled species dataset, then publishes
// snapshot v1. Idempotent: upserts by id, re-runnable safely.
//
// The dataset ships inside the server (`server/data/species.json`) so seeding
// works in the deployed Railway container, which only contains `server/`. For
// local dev the repo-root copy the frontend build generates
// (`public/data/species.json`) is used as a fallback.
//
// Root-relative image paths ("/images/species/x.jpg") are rewritten to
// absolute frontend URLs so they resolve regardless of which host serves the
// API. Override the frontend origin with SEED_ASSET_ORIGIN.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, pool } from "./client.js";
import { habitats, threatClasses, species } from "./schema.js";
import { publish } from "../lib/snapshot.js";

const here = dirname(fileURLToPath(import.meta.url));
// Preferred: dataset bundled with the server; fallback: repo-root build output.
const DATA_CANDIDATES = [
  join(here, "..", "..", "data", "species.json"),
  join(here, "..", "..", "..", "public", "data", "species.json"),
];
const ASSET_ORIGIN = process.env.SEED_ASSET_ORIGIN || "https://kalkiterminator.github.io/Earth_Echoes_v2";

function dataPath(): string {
  const found = DATA_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(`seed dataset not found; looked in: ${DATA_CANDIDATES.join(", ")}`);
  }
  return found;
}

function absolutize(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return ASSET_ORIGIN + url;
  return url;
}

/** Upsert habitats + threat classes + species from the dataset and publish a
 *  new snapshot. Returns the published snapshot version and species count. */
export async function seed(): Promise<{ version: number; count: number }> {
  const doc = JSON.parse(readFileSync(dataPath(), "utf8"));

  // Habitats
  for (const [id, h] of Object.entries<any>(doc.habitats)) {
    await db
      .insert(habitats)
      .values({ id, label: h.label, color: h.color, rgb: h.rgb, atmos: h.atmos })
      .onConflictDoUpdate({
        target: habitats.id,
        set: { label: h.label, color: h.color, rgb: h.rgb, atmos: h.atmos, updatedAt: new Date() },
      });
  }

  // Threat classes
  for (const [id, t] of Object.entries<any>(doc.threatClasses || {})) {
    await db
      .insert(threatClasses)
      .values({ id, label: t.label, color: t.color })
      .onConflictDoUpdate({
        target: threatClasses.id,
        set: { label: t.label, color: t.color, updatedAt: new Date() },
      });
  }

  // Species
  let order = 0;
  for (const s of doc.species) {
    const row = {
      id: s.id,
      name: s.name,
      scientific: s.scientific ?? null,
      status: s.status ?? null,
      habitat: s.habitat,
      habitatLabel: s.habitatLabel ?? null,
      lat: s.lat,
      lng: s.lng,
      yearExtinct: s.yearExtinct ?? null,
      population: s.population ?? null,
      threats: s.threats ?? [],
      iconicAction: s.iconicAction ?? null,
      description: s.description ?? null,
      imageUrl: absolutize(s.imageUrl),
      imageRemote: s.imageRemote ?? null,
      youtube: s.youtube ?? null,
      threatClass: s.threatClass ?? null,
      popCount: s.popCount ?? null,
      help: s.help ?? null,
      audioUrl: s.audioUrl ?? null,
      sortOrder: order++,
      published: true,
    };
    await db
      .insert(species)
      .values(row)
      .onConflictDoUpdate({ target: species.id, set: { ...row, updatedAt: new Date() } });
  }

  const { version } = await publish(null);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(species);
  return { version, count };
}

/** Seed only when the species table is empty. Safe to call on every boot: a
 *  no-op once content exists. Never throws — a seeding hiccup must not take the
 *  API down; it just logs and leaves the atlas empty until seeded manually. */
export async function seedIfEmpty(): Promise<void> {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(species);
    if (count > 0) return;
    const { version, count: n } = await seed();
    console.log(`seed: bootstrapped empty DB — ${n} species, snapshot v${version}`);
  } catch (e) {
    console.error("seedIfEmpty skipped:", e);
  }
}

// Allow `tsx src/db/seed.ts` (or `npm run db:seed`) as a standalone step.
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(({ version, count }) => {
      console.log(`seed: ${count} species, snapshot published v${version}`);
      return pool.end();
    })
    .catch((e) => {
      console.error("seed failed", e);
      process.exit(1);
    });
}
