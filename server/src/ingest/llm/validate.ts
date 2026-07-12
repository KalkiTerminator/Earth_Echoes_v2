// Validation step — Gemini (thinking) independently checks the synthesized
// record against the RAW source payloads. It is a grounding check, not a second
// opinion: every hard fact must be supported by at least one source, else it is
// flagged. Returns per-field verdicts, an overall pass, and a 0..1 confidence.
import { generateObject } from "ai";
import { z } from "zod";
import { validateModel } from "./provider.js";
import type { ProviderId, SpeciesRecord } from "../types.js";

const Verdict = z.object({
  pass: z.boolean(),
  overallConfidence: z.number().min(0).max(1),
  fieldVerdicts: z.array(
    z.object({
      field: z.string(),
      supported: z.boolean(),
      confidence: z.number().min(0).max(1),
      note: z.string().nullable(),
    }),
  ),
  flags: z.array(z.string()).describe("concrete problems the synthesizer must fix"),
});
export type ValidationVerdict = z.infer<typeof Verdict>;

const SYSTEM = `You are an independent fact-checker for a wildlife-extinction atlas.
You are given a synthesized species record and the RAW payloads from each source.
For every HARD fact (status, lat, lng, yearExtinct, threats, population, scientific name),
verify it is supported by at least one source payload. Do NOT use outside knowledge.
- If a value is unsupported or contradicts the sources, mark it unsupported and add a concrete flag.
- Coordinates within ~2 degrees of a source point count as supported.
- Prose in "description" is acceptable if its factual claims are supported.
Return per-field verdicts, an overall pass (false if any hard fact is unsupported), and a
0..1 overall confidence.`;

// Keep the raw payloads within a sane token budget for the validator.
function trimRaw(raw: Partial<Record<ProviderId, unknown>>): string {
  const s = JSON.stringify(raw);
  return s.length > 24_000 ? s.slice(0, 24_000) + "…(truncated)" : s;
}

export async function validate(input: {
  record: SpeciesRecord;
  rawSources: Partial<Record<ProviderId, unknown>>;
}): Promise<{ verdict: ValidationVerdict; usage: unknown }> {
  const prompt =
    `SYNTHESIZED RECORD:\n${JSON.stringify(input.record, null, 2)}\n\n` +
    `RAW SOURCE PAYLOADS:\n${trimRaw(input.rawSources)}`;

  const { object, usage } = await generateObject({
    model: validateModel(),
    schema: Verdict,
    system: SYSTEM,
    prompt,
    temperature: 0,
  });

  return { verdict: object, usage };
}
