// IUCN Red List connector — the authority for conservation status, population
// trend, and the structured threats list. Requires a free non-commercial token
// (env.ingest.iucnToken); when absent the connector is simply skipped so the
// pipeline still runs on the open sources.
//
// Targets the v4 API (api.iucnredlist.org/api/v4). Endpoint shapes are parsed
// defensively — confirm against the live api-docs when wiring a real token.
import { getJson } from "../http.js";
import { env } from "../../env.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

const BASE = "https://api.iucnredlist.org/api/v4";

interface Category {
  code?: string; // "EX" | "CR" | "EN" | "VU" | ...
  description?: { en?: string } | string;
}
interface Assessment {
  year_published?: string;
  red_list_category?: Category;
  population_trend?: { description?: { en?: string } | string } | string;
  threats?: { description?: { en?: string } | string }[];
}
interface TaxonResp {
  assessments?: Assessment[];
  taxon?: { scientific_name?: string };
}

function textOf(v: { en?: string } | string | undefined): string | undefined {
  if (!v) return undefined;
  return typeof v === "string" ? v : v.en;
}

export async function fetchIucn(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const token = env.ingest.iucnToken;
  if (!token) return { provider: "iucn", ok: false, fields: {}, raw: null, error: "no token (skipped)" };
  const sci = q.scientific;
  if (!sci) return { provider: "iucn", ok: false, fields: {}, raw: null, error: "no scientific name" };

  const [genus, ...rest] = sci.trim().split(/\s+/);
  const speciesEpithet = rest.join(" ");
  if (!genus || !speciesEpithet) {
    return { provider: "iucn", ok: false, fields: {}, raw: null, error: "unparseable binomial" };
  }

  try {
    const url =
      `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}` +
      `&species_name=${encodeURIComponent(speciesEpithet)}`;
    const { data } = await getJson<TaxonResp>(url, {
      provider: "iucn",
      headers: { Authorization: token },
    });

    // Most recent assessment wins.
    const assessments = (data.assessments || []).slice().sort(
      (a, b) => Number(b.year_published || 0) - Number(a.year_published || 0),
    );
    const latest = assessments[0];
    const fields: ConnectorResult["fields"] = {};
    if (latest) {
      const cat = latest.red_list_category;
      const status = cat?.code || textOf(cat?.description);
      if (status) fields.status = status;
      const trend = typeof latest.population_trend === "string"
        ? latest.population_trend
        : textOf(latest.population_trend?.description);
      if (trend) fields.population = `Population trend: ${trend}`;
      const threats = (latest.threats || [])
        .map((t) => textOf(t.description))
        .filter((x): x is string => Boolean(x));
      if (threats.length) fields.threats = threats.slice(0, 8);
    }

    return {
      provider: "iucn",
      ok: true,
      fields,
      raw: data,
      sourceUrl: "https://www.iucnredlist.org/",
    };
  } catch (e) {
    return { provider: "iucn", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
