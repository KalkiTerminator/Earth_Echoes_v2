// GBIF connector — the taxonomy backbone + coordinate source. 100% open, no key.
//   /v1/species/match      canonical scientific name + taxon key
//   /v1/species/{k}/vernacularNames   English common name
//   /v1/occurrence/search  geolocated records -> representative point
import { getJson } from "../http.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

const BASE = "https://api.gbif.org/v1";

interface MatchResp {
  usageKey?: number;
  canonicalName?: string;
  scientificName?: string;
  rank?: string;
  status?: string;
  matchType?: string;
  confidence?: number;
}
interface VernResp {
  results?: { vernacularName?: string; language?: string; preferred?: boolean }[];
}
interface OccResp {
  count?: number;
  results?: { decimalLatitude?: number; decimalLongitude?: number }[];
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** One lightweight GBIF backbone match → canonical scientific name + taxon key.
 *  Used to resolve identity once before fanning out to every source. */
export async function matchGbif(q: SpeciesQuery): Promise<{ scientific?: string; key?: number }> {
  const name = q.scientific || q.name;
  if (!name) return {};
  try {
    const { data } = await getJson<MatchResp>(
      `${BASE}/species/match?name=${encodeURIComponent(name)}`,
      { provider: "gbif" },
    );
    return { scientific: data.canonicalName, key: data.usageKey };
  } catch {
    return {};
  }
}

export async function fetchGbif(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const name = q.scientific || q.name;
  if (!name) return { provider: "gbif", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const { data: match } = await getJson<MatchResp>(
      `${BASE}/species/match?name=${encodeURIComponent(name)}`,
      { provider: "gbif" },
    );
    const key = match.usageKey;
    const fields: ConnectorResult["fields"] = {};
    if (match.canonicalName) fields.scientific = match.canonicalName;

    const raw: Record<string, unknown> = { match };

    if (key) {
      // English common name.
      const { data: vern } = await getJson<VernResp>(
        `${BASE}/species/${key}/vernacularNames?limit=50`,
        { provider: "gbif" },
      );
      raw.vernacular = vern;
      const en = (vern.results || []).find((v) => v.language === "eng");
      if (en?.vernacularName) fields.name = en.vernacularName;

      // Representative coordinate from geolocated occurrences.
      const { data: occ } = await getJson<OccResp>(
        `${BASE}/occurrence/search?taxonKey=${key}&hasCoordinate=true&hasGeospatialIssue=false&limit=300`,
        { provider: "gbif" },
      );
      raw.occurrenceCount = occ.count;
      const pts = (occ.results || []).filter(
        (r) => typeof r.decimalLatitude === "number" && typeof r.decimalLongitude === "number",
      );
      if (pts.length) {
        fields.lat = Number(median(pts.map((p) => p.decimalLatitude as number)).toFixed(3));
        fields.lng = Number(median(pts.map((p) => p.decimalLongitude as number)).toFixed(3));
      }
    }

    return {
      provider: "gbif",
      ok: true,
      fields,
      raw,
      sourceUrl: key ? `https://www.gbif.org/species/${key}` : undefined,
    };
  } catch (e) {
    return { provider: "gbif", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
