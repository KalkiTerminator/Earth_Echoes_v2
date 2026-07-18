// LLM provider layer — everything runs on Google Vertex AI (one cloud, one
// credit pool). Vertex serves both Gemini and Anthropic Claude, so a single
// service-account credential drives synthesis, validation, and media. Synthesis
// routes to whichever family its model id names (a `claude-*` id → Anthropic on
// Vertex; anything else → Gemini), so the pipeline works whether or not the
// project has Anthropic terms accepted. Model ids are env-configurable.
import { createVertex } from "@ai-sdk/google-vertex";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
import { env } from "../../env.js";

function googleAuthOptions(): { credentials: Record<string, unknown> } | undefined {
  const raw = env.ingest.googleCredentialsJson;
  if (!raw) return undefined; // falls back to GOOGLE_APPLICATION_CREDENTIALS / ADC
  try {
    return { credentials: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return undefined;
  }
}

/** True once a Vertex project + credentials are present. */
export function llmConfigured(): boolean {
  return Boolean(env.ingest.vertexProject);
}

const auth = googleAuthOptions();

const gemini = env.ingest.vertexProject
  ? createVertex({
      project: env.ingest.vertexProject,
      location: env.ingest.vertexLocation,
      ...(auth ? { googleAuthOptions: auth } : {}),
    })
  : null;

const anthropic = env.ingest.vertexProject
  ? createVertexAnthropic({
      project: env.ingest.vertexProject,
      location: env.ingest.vertexAnthropicLocation || env.ingest.vertexLocation,
      ...(auth ? { googleAuthOptions: auth } : {}),
    })
  : null;

function ensure<T>(v: T | null, what: string): T {
  if (!v) {
    throw new Error(
      `Vertex AI not configured for ${what}: set GOOGLE_VERTEX_PROJECT (+ credentials).`,
    );
  }
  return v;
}

const isClaudeId = (id: string) => /claude/i.test(id);

/** Synthesizes/reconciles the species record. Routes to Anthropic-on-Vertex for
 *  a `claude-*` id, otherwise Gemini — so Gemini works when Claude is
 *  unavailable (e.g. Anthropic terms not accepted on the project). */
export const synthModel = () =>
  isClaudeId(env.ingest.synthModel)
    ? ensure(anthropic, "synthesis")(env.ingest.synthModel)
    : ensure(gemini, "synthesis")(env.ingest.synthModel);
/** Gemini (thinking) — independent cross-validation of the synthesized record. */
export const validateModel = () => ensure(gemini, "validation")(env.ingest.validateModel);
/** Gemini multimodal — media generation for gaps. */
export const mediaModel = () => ensure(gemini, "media")(env.ingest.mediaModel);
