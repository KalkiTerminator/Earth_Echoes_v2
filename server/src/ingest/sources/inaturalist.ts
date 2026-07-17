// iNaturalist connector — CC-licensed photo, common name, a Wikipedia summary,
// place-agnostic conservation status, and (as a secondary coordinate source) a
// representative point from open-geoprivacy research-grade observations. 100%
// open, no key (<=60/min).
//   GET /v1/taxa?q={name}
//   GET /v1/observations?taxon_id={id}&geoprivacy=open&...
import { getJson } from "../http.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

interface Taxon {
  id?: number;
  name?: string; // scientific
  rank?: string;
  preferred_common_name?: string;
  wikipedia_summary?: string;
  observations_count?: number;
  default_photo?: {
    medium_url?: string;
    attribution?: string;
    license_code?: string;
  };
  conservation_status?: { status?: string; status_name?: string; authority?: string };
}
interface TaxaResp {
  results?: Taxon[];
}
interface ObsResp {
  results?: { geoprivacy?: string | null; taxon_geoprivacy?: string | null; location?: string }[];
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Median point of open (non-obscured) observations. Returns null on any issue —
// coordinates for threatened taxa are deliberately obscured by iNaturalist, so
// we only ever trust points explicitly flagged open at both obs + taxon level.
async function openObservationPoint(taxonId: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const { data } = await getJson<ObsResp>(
      `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}` +
        `&geoprivacy=open&taxon_geoprivacy=open&quality_grade=research&geo=true&per_page=100`,
      { provider: "inaturalist" },
    );
    const pts: { lat: number; lng: number }[] = [];
    for (const o of data.results || []) {
      if (o.geoprivacy && o.geoprivacy !== "open") continue;
      if (o.taxon_geoprivacy && o.taxon_geoprivacy !== "open") continue;
      if (!o.location) continue;
      const [latStr, lngStr] = o.location.split(",");
      const lat = Number(latStr), lng = Number(lngStr);
      if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push({ lat, lng });
    }
    if (!pts.length) return null;
    return {
      lat: Number(median(pts.map((p) => p.lat)).toFixed(3)),
      lng: Number(median(pts.map((p) => p.lng)).toFixed(3)),
    };
  } catch {
    return null;
  }
}

export async function fetchINaturalist(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const term = q.scientific || q.name;
  if (!term) return { provider: "inaturalist", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const { data } = await getJson<TaxaResp>(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(term)}&per_page=1`,
      { provider: "inaturalist" },
    );
    const t = data.results?.[0];
    if (!t) return { provider: "inaturalist", ok: false, fields: {}, raw: data, error: "no taxon" };

    const fields: ConnectorResult["fields"] = {};
    if (t.preferred_common_name) fields.name = t.preferred_common_name;
    if (t.name) fields.scientific = t.name;
    if (t.wikipedia_summary) fields.description = t.wikipedia_summary.replace(/<[^>]+>/g, "");
    if (t.default_photo?.medium_url) fields.imageRemote = t.default_photo.medium_url;
    const cs = t.conservation_status?.status_name || t.conservation_status?.status;
    if (cs) fields.status = cs;

    // Secondary coordinate candidate from open observations (never obscured).
    if (t.id) {
      const pt = await openObservationPoint(t.id);
      if (pt) { fields.lat = pt.lat; fields.lng = pt.lng; }
    }

    return {
      provider: "inaturalist",
      ok: true,
      fields,
      raw: t,
      sourceUrl: t.id ? `https://www.inaturalist.org/taxa/${t.id}` : undefined,
    };
  } catch (e) {
    return { provider: "inaturalist", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
