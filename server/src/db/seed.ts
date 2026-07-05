// Seeds content tables from the bundled dataset the frontend build already
// generates (public/data/species.json via scripts/build-data.mjs), then
// publishes snapshot v1. Idempotent: upserts by id, re-runnable safely.
//
// Root-relative image paths ("/images/species/x.jpg") are rewritten to
// absolute frontend URLs so they resolve regardless of which host serves the
// API. Override the frontend origin with SEED_ASSET_ORIGIN.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, pool } from "./client.js";
import { habitats, threatClasses, species } from "./schema.js";
import { publish } from "../lib/snapshot.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, "..", "..", "..", "public", "data", "species.json");
const ASSET_ORIGIN = process.env.SEED_ASSET_ORIGIN || "https://kalkiterminator.github.io/Earth_Echoes_v2";

function absolutize(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return ASSET_ORIGIN + url;
  return url;
}

async function main() {
  const doc = JSON.parse(readFileSync(dataPath, "utf8"));

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
  console.log(`seed: ${count} species, snapshot published v${version}`);
  await pool.end();
}

main().catch((e) => {
  console.error("seed failed", e);
  process.exit(1);
});
