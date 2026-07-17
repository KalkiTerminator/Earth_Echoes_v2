// OBIS (Ocean Biodiversity Information System) connector — the marine/aquatic
// coordinate authority, complementing GBIF for ocean species that terrestrial
// aggregation under-samples. 100% open, no key.
//   /v3/occurrence?scientificname={sci}&size=N   Darwin Core occurrence records
import { getJson } from "../http.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

const BASE = "https://api.obis.org/v3";

interface OccResp {
  total?: number;
  results?: { decimalLatitude?: number; decimalLongitude?: number }[];
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function fetchObis(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const name = q.scientific || q.name;
  if (!name) return { provider: "obis", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const { data } = await getJson<OccResp>(
      `${BASE}/occurrence?scientificname=${encodeURIComponent(name)}&size=300`,
      { provider: "obis" },
    );
    const pts = (data.results || []).filter(
      (r) => typeof r.decimalLatitude === "number" && typeof r.decimalLongitude === "number",
    );
    const fields: ConnectorResult["fields"] = {};
    if (pts.length) {
      fields.lat = Number(median(pts.map((p) => p.decimalLatitude as number)).toFixed(3));
      fields.lng = Number(median(pts.map((p) => p.decimalLongitude as number)).toFixed(3));
    }
    if (!pts.length) {
      return { provider: "obis", ok: false, fields: {}, raw: { total: data.total ?? 0 }, error: "no marine occurrences" };
    }
    return {
      provider: "obis",
      ok: true,
      fields,
      raw: { total: data.total, sampled: pts.length },
      sourceUrl: `https://obis.org/taxon/${encodeURIComponent(name)}`,
    };
  } catch (e) {
    return { provider: "obis", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
