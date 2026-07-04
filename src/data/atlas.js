// Runtime data layer — the Phase-2 seam.
//
// The app renders from the SPECIES / HABITATS / THREAT_CLASSES structures in
// ./species.js. At startup, loadAtlas() fetches the live document (a static
// JSON today; a backend API in Phase 2 via VITE_DATA_URL) and swaps its
// contents into those same structures IN PLACE, so every existing import
// keeps working and lookups stay synchronous. If the fetch fails or the
// document is malformed, the bundled data stays in effect — the atlas can
// never go blank because a data source is down.
//
// Phase 2: set VITE_DATA_URL (e.g. https://<railway-app>/api/species) in the
// hosting env. No code changes required as long as the endpoint returns
// { version, species[], habitats{}, threatClasses{} } in this shape.
import { SPECIES, HABITATS, THREAT_CLASSES } from "./species.js";

const DATA_URL = import.meta.env.VITE_DATA_URL || "/data/species.json";

function validate(doc) {
  if (!doc || typeof doc !== "object") return "not an object";
  if (!Array.isArray(doc.species) || doc.species.length === 0) return "species missing/empty";
  if (!doc.habitats || typeof doc.habitats !== "object") return "habitats missing";
  for (const s of doc.species) {
    if (!s.id || !s.name) return `species missing id/name`;
    if (typeof s.lat !== "number" || typeof s.lng !== "number") return `${s.id}: bad coordinates`;
    if (!doc.habitats[s.habitat]) return `${s.id}: unknown habitat "${s.habitat}"`;
    if (s.yearExtinct !== null && typeof s.yearExtinct !== "number") return `${s.id}: bad yearExtinct`;
  }
  for (const h of Object.values(doc.habitats)) {
    if (!h.color || !h.rgb) return "habitat missing color/rgb";
  }
  return null;
}

function swapInPlace(target, next) {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, next);
}

let promise = null;

export function loadAtlas() {
  if (!promise) {
    promise = (async () => {
      try {
        const res = await fetch(DATA_URL, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const doc = await res.json();
        const problem = validate(doc);
        if (problem) throw new Error(`invalid document: ${problem}`);
        SPECIES.length = 0;
        SPECIES.push(...doc.species);
        swapInPlace(HABITATS, doc.habitats);
        if (doc.threatClasses && typeof doc.threatClasses === "object") {
          swapInPlace(THREAT_CLASSES, doc.threatClasses);
        }
      } catch (e) {
        // Bundled data remains in place — log and carry on.
        console.warn(`[atlas] using bundled dataset (${e.message})`);
      }
      return { species: SPECIES, habitats: HABITATS, threatClasses: THREAT_CLASSES };
    })();
  }
  return promise;
}
