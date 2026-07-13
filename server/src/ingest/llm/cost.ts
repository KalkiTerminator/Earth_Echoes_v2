// Rough token-cost estimation (US cents) so runs are metered even though spend
// lands on Google credits. Rates are per 1M tokens and intentionally
// conservative; tune to your Vertex pricing. `kind` selects the price row.
type Kind = "synth" | "validate" | "media";

const PER_MTOK: Record<Kind, { in: number; out: number }> = {
  // Claude Haiku class.
  synth: { in: 25, out: 125 }, // cents per 1M tokens
  // Gemini Flash class.
  validate: { in: 8, out: 30 },
  media: { in: 8, out: 30 },
};

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number; // older AI SDK field names
  completionTokens?: number;
}

export function estimateCostCents(kind: Kind, usage: TokenUsage | undefined): number {
  const inTok = usage?.inputTokens ?? usage?.promptTokens ?? 0;
  const outTok = usage?.outputTokens ?? usage?.completionTokens ?? 0;
  const rate = PER_MTOK[kind];
  return (inTok / 1_000_000) * rate.in + (outTok / 1_000_000) * rate.out;
}

export function totalTokens(usage: TokenUsage | undefined): number {
  return (usage?.inputTokens ?? usage?.promptTokens ?? 0)
    + (usage?.outputTokens ?? usage?.completionTokens ?? 0);
}
