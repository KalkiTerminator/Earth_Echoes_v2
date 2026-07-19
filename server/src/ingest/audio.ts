// Multi-source audio resolver. Real recordings are preferred, tried in priority
// order (each fail-soft); the first hit wins. Generation (llm/audio.ts) is a
// separate last resort handled by the orchestrator when this returns null.
//   1. Xeno-canto  (already fetched during gather — passed in)
//   2. iNaturalist observation sounds
//   3. Wikimedia Commons audio files
// Every hit carries a human-readable credit for reader-facing disclosure.
import { getJson } from "./http.js";
import type { SpeciesQuery } from "./types.js";

export interface AudioHit {
  url: string;
  credit: string;
  sourceUrl?: string;
  provider: string;
  generated?: boolean;
}

interface INatSound { file_url?: string; license_code?: string | null }
interface INatObs {
  uri?: string;
  sounds?: INatSound[];
  user?: { login?: string; name?: string | null };
}
interface INatTaxa { results?: { id?: number }[] }
interface INatObsResp { results?: INatObs[] }

async function fromINaturalist(q: SpeciesQuery): Promise<AudioHit | null> {
  const term = q.scientific || q.name;
  if (!term) return null;
  try {
    const { data: taxa } = await getJson<INatTaxa>(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(term)}&per_page=1`,
      { provider: "inaturalist" },
    );
    const id = taxa.results?.[0]?.id;
    if (!id) return null;
    const { data } = await getJson<INatObsResp>(
      `https://api.inaturalist.org/v1/observations?taxon_id=${id}&sounds=true` +
        `&license_code=cc0,cc-by,cc-by-nc&order_by=votes&per_page=5`,
      { provider: "inaturalist" },
    );
    for (const o of data.results || []) {
      const s = (o.sounds || []).find((x) => x.file_url);
      if (s?.file_url) {
        const who = o.user?.name || o.user?.login;
        const lic = (s.license_code || "").toUpperCase();
        return {
          url: s.file_url,
          credit: `iNaturalist${who ? ` — ${who}` : ""}${lic ? ` (${lic})` : ""}`,
          sourceUrl: o.uri,
          provider: "inaturalist",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

interface CommonsPage {
  imageinfo?: {
    url?: string;
    descriptionurl?: string;
    extmetadata?: {
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
    };
  }[];
}
interface CommonsResp { query?: { pages?: Record<string, CommonsPage> } }

async function fromCommons(q: SpeciesQuery): Promise<AudioHit | null> {
  const term = q.scientific || q.name;
  if (!term) return null;
  try {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search` +
      `&gsrsearch=${encodeURIComponent(term + " filetype:audio")}&gsrnamespace=6&gsrlimit=5` +
      `&prop=imageinfo&iiprop=url|extmetadata`;
    const { data } = await getJson<CommonsResp>(url, { provider: "commons" });
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      const u = info?.url;
      if (u && /\.(ogg|oga|mp3|wav|flac|opus)$/i.test(u)) {
        const artist = info?.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "").trim();
        const lic = info?.extmetadata?.LicenseShortName?.value;
        return {
          url: u,
          credit: `Wikimedia Commons${artist ? ` — ${artist}` : ""}${lic ? ` (${lic})` : ""}`,
          sourceUrl: info?.descriptionurl,
          provider: "commons",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve the best real recording. `xeno` is the Xeno-canto result already
 * gathered (url + credit) — passed in to avoid a duplicate fetch. Returns the
 * first source that yields audio, or null (→ orchestrator may then generate).
 */
export async function resolveAudio(
  q: SpeciesQuery,
  xeno?: { url?: string | null; credit?: string | null } | null,
): Promise<AudioHit | null> {
  if (xeno?.url) {
    return { url: xeno.url, credit: xeno.credit || "Xeno-canto", provider: "xenocanto" };
  }
  return (await fromINaturalist(q)) ?? (await fromCommons(q));
}
