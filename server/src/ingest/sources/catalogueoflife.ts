// Catalogue of Life connector — the authoritative taxonomic backbone, used to
// cross-check the canonical scientific name (and synonyms) that GBIF resolves.
// Open via the ChecklistBank API, no key. The COL release changes monthly, so
// the dataset key is configurable; when it is unset the connector skips cleanly
// rather than guessing a stale release.
//   /dataset/{key}/nameusage/match?q={name}   fuzzy name match against a release
import { getJson } from "../http.js";
import { env } from "../../env.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

const BASE = "https://api.checklistbank.org";

interface MatchResp {
  usage?: {
    id?: string;
    label?: string;
    name?: { scientificName?: string; canonicalName?: string };
    rank?: string;
    status?: string;
  };
  name?: { scientificName?: string; canonicalName?: string };
  type?: string; // exact | variant | none ...
}

export async function fetchCatalogueOfLife(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const dataset = env.ingest.colDataset;
  if (!dataset) {
    return { provider: "catalogueoflife", ok: false, fields: {}, raw: null, error: "no dataset key (skipped)" };
  }
  const name = q.scientific || q.name;
  if (!name) return { provider: "catalogueoflife", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const { data } = await getJson<MatchResp>(
      `${BASE}/dataset/${encodeURIComponent(dataset)}/nameusage/match?q=${encodeURIComponent(name)}`,
      { provider: "catalogueoflife" },
    );
    const nm = data.usage?.name ?? data.name;
    const canonical = nm?.canonicalName || nm?.scientificName;
    if (!canonical || data.type === "none") {
      return { provider: "catalogueoflife", ok: false, fields: {}, raw: data, error: "no match" };
    }
    const fields: ConnectorResult["fields"] = { scientific: canonical };
    return {
      provider: "catalogueoflife",
      ok: true,
      fields,
      raw: data,
      sourceUrl: data.usage?.id
        ? `https://www.catalogueoflife.org/data/taxon/${data.usage.id}`
        : undefined,
    };
  } catch (e) {
    return { provider: "catalogueoflife", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
