// Shared types for the autonomous ingestion pipeline.
// A "connector" fetches from one external source and returns a normalized
// partial species record + the raw payload. A "resolver" fans out to the top-3
// connectors for one data domain and produces a facts+conflicts bundle that the
// synthesis LLM reconciles into a final record.

export type ProviderId =
  | "gbif" | "iucn" | "wikimedia" | "inaturalist" | "wikidata"
  | "obis" | "ebird" | "catalogueoflife" | "xenocanto"
  | "openai" | "deepseek" | "gemini"
  | "firecrawl" | "apify" | "edge"
  | "commons" | "elevenlabs"
  | "speciesplus" | "itis" | "flickr" | "wwflpi" | "biotime";

// The proposed public species record (subset of the DB/frontend contract).
export interface SpeciesRecord {
  id?: string;
  name?: string;
  scientific?: string;
  status?: string | null;
  habitat?: string;
  habitatLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
  yearExtinct?: number | null;
  population?: string | null;
  threats?: string[];
  iconicAction?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageRemote?: string | null;
  youtube?: string | null;
  threatClass?: string | null;
  popCount?: number | null;
  help?: string[] | null;
  audioUrl?: string | null;
  audioCredit?: string | null;
}

// Result of a single connector call.
export interface ConnectorResult<T = unknown> {
  provider: ProviderId;
  ok: boolean;
  /** Normalized partial fields this source contributes. */
  fields: Partial<SpeciesRecord>;
  /** Raw upstream payload, retained for the validator to ground against. */
  raw: T | null;
  /** Canonical URL for citation/attribution. */
  sourceUrl?: string;
  error?: string;
  fromCache?: boolean;
}

// One candidate value for a field, attributed to its source.
export interface FieldCandidate {
  value: unknown;
  provider: ProviderId;
  sourceUrl?: string;
}

// All candidate values gathered for one field across sources.
export interface ResolvedField {
  field: keyof SpeciesRecord;
  candidates: FieldCandidate[];
  /** True when sources disagree — the synthesis LLM must reconcile. */
  conflict: boolean;
}

// What a resolver hands to the synthesis LLM.
export interface ResolverBundle {
  domain: "taxonomy" | "status" | "coordinates" | "media" | "audio" | "traits";
  fields: ResolvedField[];
  /** provider -> raw payload, kept for grounding/validation. */
  raw: Partial<Record<ProviderId, unknown>>;
  /** Non-fatal problems (source down, no data, etc.). */
  notes: string[];
}

// Input shared by every connector: what species we're resolving.
export interface SpeciesQuery {
  /** Common name, if known. */
  name?: string;
  /** Scientific (binomial) name — the strongest key across sources. */
  scientific?: string;
  /** GBIF backbone taxon key, once taxonomy is resolved. */
  gbifKey?: number;
}
