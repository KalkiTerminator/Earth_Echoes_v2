// Wikidata connector — a semantic cross-check: Commons image (P18) and IUCN
// conservation-status label (P141), keyed by taxon name (P225). 100% open;
// requires the descriptive User-Agent the http client sends. Complex queries
// time out, so this is a single tight lookup.
import { getJson } from "../http.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

interface SparqlResp {
  results?: {
    bindings?: {
      item?: { value?: string };
      image?: { value?: string };
      statusLabel?: { value?: string };
      commonLabel?: { value?: string };
    }[];
  };
}

export async function fetchWikidata(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const sci = q.scientific;
  if (!sci) return { provider: "wikidata", ok: false, fields: {}, raw: null, error: "no scientific name" };

  // Escape quotes/backslashes for the SPARQL string literal.
  const lit = sci.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const query = `SELECT ?item ?image ?statusLabel ?commonLabel WHERE {
  ?item wdt:P225 "${lit}".
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P141 ?status. ?status rdfs:label ?statusLabel. FILTER(LANG(?statusLabel)="en") }
  OPTIONAL { ?item wdt:P1843 ?commonLabel. FILTER(LANG(?commonLabel)="en") }
} LIMIT 1`;

  try {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
    const { data } = await getJson<SparqlResp>(url, { provider: "wikidata" });
    const b = data.results?.bindings?.[0];
    if (!b) return { provider: "wikidata", ok: false, fields: {}, raw: data, error: "no match" };

    const fields: ConnectorResult["fields"] = {};
    if (b.image?.value) fields.imageRemote = b.image.value;
    if (b.statusLabel?.value) fields.status = b.statusLabel.value;
    if (b.commonLabel?.value) fields.name = b.commonLabel.value;

    return {
      provider: "wikidata",
      ok: true,
      fields,
      raw: b,
      sourceUrl: b.item?.value,
    };
  } catch (e) {
    return { provider: "wikidata", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
