// Species+ (UNEP-WCMC) connector — international legal-protection status: CITES
// appendix listings and CMS. Complements IUCN's extinction risk with trade/legal
// protection, giving the conservation-status category a third+ authority. Needs a
// free API token (X-Authentication-Token); skips cleanly when unconfigured.
//   /api/v1/taxon_concepts?name={scientific}
import { getJson } from "../http.js";
import { env } from "../../env.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

const BASE = "https://api.speciesplus.net/api/v1";

interface TaxonConcept {
  id?: number;
  full_name?: string;
  cites_listing?: string; // e.g. "I", "II", "I/II"
  cms_listing?: string;
}
interface Resp { taxon_concepts?: TaxonConcept[] }

export async function fetchSpeciesPlus(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const token = env.ingest.speciesPlusToken;
  if (!token) return { provider: "speciesplus", ok: false, fields: {}, raw: null, error: "no token (skipped)" };
  const name = q.scientific || q.name;
  if (!name) return { provider: "speciesplus", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const { data } = await getJson<Resp>(
      `${BASE}/taxon_concepts?name=${encodeURIComponent(name)}`,
      { provider: "speciesplus", headers: { "X-Authentication-Token": token } },
    );
    const tc = data.taxon_concepts?.[0];
    if (!tc) return { provider: "speciesplus", ok: false, fields: {}, raw: data, error: "no match" };

    // Legal listings contextualize threats (trade pressure / protection).
    const threats: string[] = [];
    if (tc.cites_listing) threats.push(`CITES Appendix ${tc.cites_listing} (international trade regulated)`);
    if (tc.cms_listing) threats.push(`CMS Appendix ${tc.cms_listing} (migratory-species protection)`);
    const fields: ConnectorResult["fields"] = {};
    if (threats.length) fields.threats = threats;

    return {
      provider: "speciesplus",
      ok: true,
      fields,
      raw: tc,
      sourceUrl: tc.id ? `https://speciesplus.net/#/taxon_concepts/${tc.id}` : "https://speciesplus.net/",
    };
  } catch (e) {
    return { provider: "speciesplus", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
