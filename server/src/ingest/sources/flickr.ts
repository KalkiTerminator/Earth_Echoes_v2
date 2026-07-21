// Flickr connector — Creative-Commons-licensed wildlife photography, a third+
// image source for the media category alongside Wikimedia and iNaturalist. Only
// CC/public-domain licenses are requested. Needs a free API key; skips cleanly
// when unconfigured.
//   flickr.photos.search (license-filtered, relevance-sorted)
import { getJson } from "../http.js";
import { env } from "../../env.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

const BASE = "https://api.flickr.com/services/rest";
// CC-BY, CC-BY-SA, CC-BY-ND, CC-BY-NC, CC-BY-NC-SA, PDM, CC0 — reusable-with-credit.
const LICENSES = "1,2,3,4,5,6,7,9,10";

interface Photo {
  id?: string;
  owner?: string;
  secret?: string;
  server?: string;
  url_l?: string;
  ownername?: string;
}
interface Resp { photos?: { photo?: Photo[] } }

export async function fetchFlickr(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const key = env.ingest.flickrKey;
  if (!key) return { provider: "flickr", ok: false, fields: {}, raw: null, error: "no key (skipped)" };
  const name = q.scientific || q.name;
  if (!name) return { provider: "flickr", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const url =
      `${BASE}?method=flickr.photos.search&api_key=${encodeURIComponent(key)}` +
      `&text=${encodeURIComponent(name)}&license=${LICENSES}&sort=relevance&media=photos` +
      `&content_type=1&per_page=1&extras=url_l,owner_name,license&format=json&nojsoncallback=1`;
    const { data } = await getJson<Resp>(url, { provider: "flickr" });
    const p = data.photos?.photo?.[0];
    if (!p) return { provider: "flickr", ok: false, fields: {}, raw: data, error: "no photo" };
    const img = p.url_l || (p.server ? `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_b.jpg` : undefined);
    if (!img) return { provider: "flickr", ok: false, fields: {}, raw: p, error: "no url" };
    return {
      provider: "flickr",
      ok: true,
      fields: { imageRemote: img },
      raw: p,
      sourceUrl: p.owner && p.id ? `https://www.flickr.com/photos/${p.owner}/${p.id}` : undefined,
    };
  } catch (e) {
    return { provider: "flickr", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
