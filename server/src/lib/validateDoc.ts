// Server-side mirror of validate() in src/data/atlas.js (frontend). Kept
// line-for-line equivalent so a document that passes here is guaranteed to
// pass the frontend's own guard — a half-edited draft can never go live.
// If you change the rules here, change them there too.
export interface AtlasDoc {
  version?: number;
  species: any[];
  habitats: Record<string, any>;
  threatClasses?: Record<string, any>;
}

export function validateDoc(doc: any): string | null {
  if (!doc || typeof doc !== "object") return "not an object";
  if (!Array.isArray(doc.species) || doc.species.length === 0) return "species missing/empty";
  if (!doc.habitats || typeof doc.habitats !== "object") return "habitats missing";
  for (const s of doc.species) {
    if (!s.id || !s.name) return `species missing id/name`;
    if (typeof s.lat !== "number" || typeof s.lng !== "number") return `${s.id}: bad coordinates`;
    if (!doc.habitats[s.habitat]) return `${s.id}: unknown habitat "${s.habitat}"`;
    if (s.yearExtinct !== null && typeof s.yearExtinct !== "number") return `${s.id}: bad yearExtinct`;
  }
  for (const h of Object.values(doc.habitats) as any[]) {
    if (!h.color || !h.rgb) return "habitat missing color/rgb";
  }
  return null;
}
