// iNaturalist connector — CC-licensed photo, common name, a Wikipedia summary,
// and place-agnostic conservation status. 100% open, no key (<=60/min).
//   GET /v1/taxa?q={name}
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
