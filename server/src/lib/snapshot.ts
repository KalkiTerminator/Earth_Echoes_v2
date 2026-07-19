// Assembles the public atlas document from published content rows, validates
// it, and stores immutable versioned snapshots. GET /api/species serves the
// latest snapshot from an in-memory cache (refreshed on publish / every 60s)
// so the hot public endpoint never touches the database per request.
import { desc, eq, asc } from "drizzle-orm";
import { db } from "../db/client.js";
import { species, habitats, threatClasses, atlasSnapshots } from "../db/schema.js";
import { validateDoc, type AtlasDoc } from "./validateDoc.js";

// Shape a species DB row into the frontend contract (drop nulls/internal cols).
function shapeSpecies(row: any) {
  const out: Record<string, any> = {
    id: row.id,
    name: row.name,
    scientific: row.scientific,
    status: row.status,
    habitat: row.habitat,
    habitatLabel: row.habitatLabel,
    lat: row.lat,
    lng: row.lng,
    yearExtinct: row.yearExtinct ?? null,
    population: row.population,
    threats: row.threats ?? [],
    iconicAction: row.iconicAction,
    description: row.description,
    imageUrl: row.imageUrl,
    imageRemote: row.imageRemote,
    youtube: row.youtube,
  };
  if (row.threatClass) out.threatClass = row.threatClass;
  if (row.popCount != null) out.popCount = row.popCount;
  if (row.help) out.help = row.help;
  if (row.audioUrl) out.audioUrl = row.audioUrl;
  if (row.audioCredit) out.audioCredit = row.audioCredit;
  return out;
}

// Build the full document from current DB state (drafts optionally included).
export async function assembleDoc(opts: { includeUnpublished?: boolean } = {}): Promise<AtlasDoc> {
  const [habRows, tcRows, spRows] = await Promise.all([
    db.select().from(habitats).orderBy(asc(habitats.sortOrder)),
    db.select().from(threatClasses).orderBy(asc(threatClasses.sortOrder)),
    db.select().from(species).orderBy(asc(species.sortOrder)),
  ]);

  const habObj: Record<string, any> = {};
  for (const h of habRows) {
    habObj[h.id] = { label: h.label, color: h.color, rgb: h.rgb, atmos: h.atmos };
  }
  const tcObj: Record<string, any> = {};
  for (const t of tcRows) {
    tcObj[t.id] = { label: t.label, color: t.color };
  }
  const list = opts.includeUnpublished ? spRows : spRows.filter((s) => s.published);
  return {
    species: list.map(shapeSpecies),
    habitats: habObj,
    threatClasses: tcObj,
  };
}

// ---- In-memory snapshot cache ----
let cached: { version: number; doc: AtlasDoc; etag: string; loadedAt: number } | null = null;
const TTL_MS = 60_000;

async function loadLatest() {
  const [snap] = await db
    .select()
    .from(atlasSnapshots)
    .orderBy(desc(atlasSnapshots.version))
    .limit(1);
  if (!snap) return null;
  cached = {
    version: snap.version,
    doc: snap.doc as AtlasDoc,
    etag: `"v${snap.version}"`,
    loadedAt: Date.now(),
  };
  return cached;
}

export async function getSnapshot() {
  if (!cached || Date.now() - cached.loadedAt > TTL_MS) {
    await loadLatest();
  }
  return cached;
}

// Validate current draft state, store a new snapshot version, refresh cache.
// Throws { problem } if the assembled document fails validation.
export async function publish(publishedBy: string | null): Promise<{ version: number }> {
  const doc = await assembleDoc({ includeUnpublished: false });
  const problem = validateDoc(doc);
  if (problem) {
    const err = new Error(problem) as Error & { problem: string };
    err.problem = problem;
    throw err;
  }
  const [latest] = await db
    .select({ version: atlasSnapshots.version })
    .from(atlasSnapshots)
    .orderBy(desc(atlasSnapshots.version))
    .limit(1);
  const version = (latest?.version ?? 0) + 1;
  const stored = { version, ...doc };
  await db.insert(atlasSnapshots).values({ version, doc: stored, publishedBy });
  cached = null;
  await loadLatest();
  return { version };
}
