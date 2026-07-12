// Synthesis step — Claude Haiku on Vertex reconciles the multi-source
// facts+conflicts bundles into ONE structured species record, grounded in the
// provided sources (it must not invent hard facts). Returns per-field
// provenance for the validator and the audit trail.
import { generateObject } from "ai";
import { z } from "zod";
import { synthModel } from "./provider.js";
import type { ResolverBundle, SpeciesRecord } from "../types.js";

const SynthOut = z.object({
  name: z.string(),
  scientific: z.string(),
  status: z.string().nullable(),
  habitat: z.string().describe("EXACTLY one of the allowed habitat ids"),
  habitatLabel: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  yearExtinct: z.number().nullable().describe("extinction year; negative = BCE; null if extant"),
  population: z.string().nullable(),
  threats: z.array(z.string()),
  iconicAction: z.string().nullable().describe("a short evocative behavior phrase"),
  description: z.string().describe("2-4 sentence profile, evocative but factually grounded"),
  provenance: z.array(
    z.object({ field: z.string(), source: z.string(), confidence: z.number().min(0).max(1) }),
  ),
});
export type SynthOutput = z.infer<typeof SynthOut>;

export interface SynthInput {
  bundles: ResolverBundle[];
  allowedHabitats: { id: string; label: string }[];
  priorFlags?: string[];
}

const SYSTEM = `You reconcile multi-source biodiversity data into ONE accurate species record for a public extinction atlas.
RULES:
1. Every hard fact (status, lat, lng, yearExtinct, threats, population) MUST come from a provided source — never invent one. If all sources lack it, set it null.
2. When sources conflict, prefer the more authoritative one (status: IUCN > GBIF > iNaturalist > Wikidata; coordinates: GBIF) and reflect that choice.
3. "description" may be evocative prose but every claim must be supported by the sources.
4. "habitat" MUST be exactly one of the allowed habitat ids given in the prompt.
5. Fill "provenance" with the source id backing each hard field and a 0..1 confidence.`;

function factLines(bundles: ResolverBundle[]): string {
  const out: string[] = [];
  for (const b of bundles) {
    for (const f of b.fields) {
      const vals = f.candidates
        .map((c) => `[${c.provider}] ${JSON.stringify(c.value)}`)
        .join(" | ");
      out.push(`${String(f.field)}${f.conflict ? " (CONFLICT)" : ""}: ${vals}`);
    }
  }
  return out.join("\n");
}

function toRecord(o: SynthOutput, allowed: { id: string }[]): SpeciesRecord {
  const ids = new Set(allowed.map((h) => h.id));
  const habitat = ids.has(o.habitat) ? o.habitat : (allowed[0]?.id ?? "other");
  return {
    name: o.name,
    scientific: o.scientific,
    status: o.status,
    habitat,
    habitatLabel: o.habitatLabel,
    lat: o.lat,
    lng: o.lng,
    yearExtinct: o.yearExtinct,
    population: o.population,
    threats: o.threats,
    iconicAction: o.iconicAction,
    description: o.description,
  };
}

export async function synthesize(input: SynthInput): Promise<{
  record: SpeciesRecord;
  provenance: SynthOutput["provenance"];
  usage: unknown;
}> {
  const habitats = input.allowedHabitats.map((h) => `${h.id} (${h.label})`).join(", ");
  let prompt = `Allowed habitat ids: ${habitats}\n\nReconciled facts from sources:\n${factLines(input.bundles)}`;
  if (input.priorFlags?.length) {
    prompt += `\n\nA prior validation flagged these problems — correct them:\n- ${input.priorFlags.join("\n- ")}`;
  }

  const { object, usage } = await generateObject({
    model: synthModel(),
    schema: SynthOut,
    system: SYSTEM,
    prompt,
    temperature: 0.2,
  });

  return { record: toRecord(object, input.allowedHabitats), provenance: object.provenance, usage };
}
