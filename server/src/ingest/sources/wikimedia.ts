// Wikimedia connector — clean intro-paragraph summary + a lead image. 100%
// open; requires the descriptive User-Agent the shared http client sends.
//   GET /api/rest_v1/page/summary/{title}
import { getJson } from "../http.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

interface Summary {
  title?: string;
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
  type?: string; // "standard" | "disambiguation" | ...
}

async function summary(title: string): Promise<Summary | null> {
  try {
    const { data } = await getJson<Summary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { provider: "wikimedia" },
    );
    if (data.type === "disambiguation" || !data.extract) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchWikimedia(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  // Prefer the scientific name (canonical article), fall back to common name.
  const tries = [q.scientific, q.name].filter(Boolean) as string[];
  for (const title of tries) {
    const data = await summary(title);
    if (!data) continue;
    const fields: ConnectorResult["fields"] = {};
    if (data.extract) fields.description = data.extract;
    const img = data.originalimage?.source || data.thumbnail?.source;
    if (img) fields.imageRemote = img;
    return {
      provider: "wikimedia",
      ok: true,
      fields,
      raw: data,
      sourceUrl: data.content_urls?.desktop?.page,
    };
  }
  return { provider: "wikimedia", ok: false, fields: {}, raw: null, error: "no summary" };
}
