// The synth ⇄ validate loop. Claude synthesizes a record; Gemini validates it
// against the raw sources; validator flags are fed back to the synthesizer and
// it retries — until the validator passes or we hit maxIters / the run budget.
// Every LLM call is cost-estimated, metered, and charged to the run budget.
import { synthesize, type SynthOutput } from "./synthesize.js";
import { validate, type ValidationVerdict } from "./validate.js";
import { estimateCostCents, totalTokens, type TokenUsage } from "./cost.js";
import { meter, RunBudget } from "../budget.js";
import type { ProviderId, ResolverBundle, SpeciesRecord } from "../types.js";

export interface LoopInput {
  bundles: ResolverBundle[];
  rawSources: Partial<Record<ProviderId, unknown>>;
  allowedHabitats: { id: string; label: string }[];
  maxIters?: number;
}

export interface LoopResult {
  record: SpeciesRecord;
  provenance: SynthOutput["provenance"];
  validation: ValidationVerdict;
  confidence: number;
  iterations: number;
  passed: boolean;
  trace: { iteration: number; pass: boolean; flags: string[] }[];
}

export async function synthValidateLoop(input: LoopInput, budget: RunBudget): Promise<LoopResult> {
  const maxIters = input.maxIters ?? 3;
  let flags: string[] = [];
  let last: Pick<LoopResult, "record" | "provenance" | "validation"> | null = null;
  const trace: LoopResult["trace"] = [];

  for (let i = 1; i <= maxIters; i++) {
    const s = await synthesize({
      bundles: input.bundles,
      allowedHabitats: input.allowedHabitats,
      priorFlags: flags,
    });
    const sCost = estimateCostCents("synth", s.usage as TokenUsage);
    budget.charge(sCost);
    await meter("vertex-anthropic", { calls: 1, tokens: totalTokens(s.usage as TokenUsage), costCents: sCost });

    const v = await validate({ record: s.record, rawSources: input.rawSources });
    const vCost = estimateCostCents("validate", v.usage as TokenUsage);
    budget.charge(vCost);
    await meter("vertex-gemini", { calls: 1, tokens: totalTokens(v.usage as TokenUsage), costCents: vCost });

    last = { record: s.record, provenance: s.provenance, validation: v.verdict };
    trace.push({ iteration: i, pass: v.verdict.pass, flags: v.verdict.flags });

    if (v.verdict.pass) {
      return { ...last, confidence: v.verdict.overallConfidence, iterations: i, passed: true, trace };
    }
    flags = v.verdict.flags;
  }

  // Exhausted iterations without a clean pass — return the best attempt for the
  // review queue (it will not auto-publish unless confidence clears the bar).
  return {
    ...(last as Pick<LoopResult, "record" | "provenance" | "validation">),
    confidence: last?.validation.overallConfidence ?? 0,
    iterations: maxIters,
    passed: false,
    trace,
  };
}
