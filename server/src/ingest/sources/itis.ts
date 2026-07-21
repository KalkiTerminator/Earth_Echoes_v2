// ITIS (Integrated Taxonomic Information System) connector — a government-backed
// taxonomic authority, used as an additional scientific-name cross-check in the
// taxonomy category. 100% open, no key.
//   /jsonservice/searchByScientificName?srchKey={name}
import { getJson } from "../http.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

const BASE = "https://www.itis.gov/ITISWebService/jsonservice";

interface ItisName { combinedName?: string; tsn?: string }
interface Resp { scientificNames?: (ItisName | null)[] }

export async function fetchItis(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const name = q.scientific || q.name;
  if (!name) return { provider: "itis", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const { data } = await getJson<Resp>(
      `${BASE}/searchByScientificName?srchKey=${encodeURIComponent(name)}`,
      { provider: "itis" },
    );
    const first = (data.scientificNames || []).find((x): x is ItisName => !!x?.combinedName);
    if (!first) return { provider: "itis", ok: false, fields: {}, raw: data, error: "no match" };
    return {
      provider: "itis",
      ok: true,
      fields: { scientific: first.combinedName },
      raw: first,
      sourceUrl: first.tsn
        ? `https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=${first.tsn}`
        : undefined,
    };
  } catch (e) {
    return { provider: "itis", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
