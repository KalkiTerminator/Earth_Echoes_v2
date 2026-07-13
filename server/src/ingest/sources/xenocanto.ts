// Xeno-canto connector — real animal vocalizations (chiefly birds). Open API
// (v2), no key; be gentle (~10 requests / 20s, enforced by the rate limiter).
// Extinct/prehistoric species simply return nothing (no recording exists) — the
// viewer then falls back to the generative habitat ambience.
import { getJson } from "../http.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

interface Recording {
  file?: string;      // audio URL (may be protocol-relative "//…")
  "file-name"?: string;
  q?: string;         // quality A..E
  rec?: string;       // recordist (attribution)
  lic?: string;       // license URL
  url?: string;       // recording page
}
interface XcResp {
  numRecordings?: string;
  recordings?: Recording[];
}

function absolutize(u: string): string {
  if (u.startsWith("//")) return "https:" + u;
  return u;
}

export async function fetchXenoCanto(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const sci = q.scientific || q.name;
  if (!sci) return { provider: "xenocanto", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    // Prefer the highest-quality recording.
    const url = `https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(sci)}+q:A`;
    const { data } = await getJson<XcResp>(url, { provider: "xenocanto" });
    const rec = data.recordings?.find((r) => r.file) ?? undefined;
    if (!rec?.file) return { provider: "xenocanto", ok: false, fields: {}, raw: data, error: "no recording" };
    return {
      provider: "xenocanto",
      ok: true,
      fields: { audioUrl: absolutize(rec.file) },
      raw: rec,
      sourceUrl: rec.url ? absolutize(rec.url) : "https://xeno-canto.org/",
    };
  } catch (e) {
    return { provider: "xenocanto", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
