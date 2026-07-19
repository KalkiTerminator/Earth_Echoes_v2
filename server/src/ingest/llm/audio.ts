// Audio generation — last resort when no real recording exists anywhere. The
// synthesis LLM (Gemini) writes a short, grounded sound-effects prompt from the
// species record; ElevenLabs' Sound Effects endpoint renders it. The result is
// stored and ALWAYS disclosed to the reader as AI-generated (never passed off as
// a real recording). No-op unless ELEVENLABS_API_KEY is configured.
import { generateText } from "ai";
import { synthModel, llmConfigured } from "./provider.js";
import { estimateCostCents, totalTokens, type TokenUsage } from "./cost.js";
import { meter, RunBudget } from "../budget.js";
import { throttle } from "../ratelimit.js";
import { save } from "../../lib/storage.js";
import { db, schema } from "../../db/client.js";
import { env } from "../../env.js";
import type { SpeciesRecord } from "../types.js";

const ELEVEN_SFX = "https://api.elevenlabs.io/v1/sound-generation";

/** Returns a stored audio URL + credit, or null if generation is off/failed. */
export async function generateSpeciesAudio(
  species: SpeciesRecord,
  budget: RunBudget,
  createdBy?: string,
): Promise<{ url: string; credit: string } | null> {
  const key = env.ingest.elevenLabsKey;
  if (!key || !llmConfigured()) return null;
  try {
    // 1. Gemini writes a concise, grounded sound-effects prompt.
    const { text, usage } = await generateText({
      model: synthModel(),
      prompt:
        `Write a concise sound-effects prompt (max 40 words) describing the natural ` +
        `vocalization or call of ${species.name} (${species.scientific}) in its habitat. ` +
        `Output only the sound description — no preamble, no quotes.`,
    });
    const sfxPrompt = (text || "").trim().slice(0, 450) || `The natural call of ${species.name}`;
    const cost = estimateCostCents("synth", usage as TokenUsage);
    budget.charge(cost);
    await meter("vertex-anthropic", { calls: 1, tokens: totalTokens(usage as TokenUsage), costCents: cost });

    // 2. ElevenLabs Sound Effects renders it to MP3.
    await throttle("elevenlabs");
    await meter("elevenlabs", { calls: 1 });
    const res = await fetch(ELEVEN_SFX, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify(
        env.ingest.audioModel
          ? { text: sfxPrompt, model_id: env.ingest.audioModel }
          : { text: sfxPrompt },
      ),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;

    const saved = await save(buf);
    await db.insert(schema.media).values({
      id: saved.id,
      kind: saved.kind,
      mime: saved.mime,
      sizeBytes: saved.size,
      url: saved.url,
      originalName: `${species.scientific ?? species.name ?? saved.id}.sfx`,
      createdBy: createdBy ?? null,
      generatedBy: "elevenlabs",
      license: "AI-generated sound effect (ElevenLabs)",
      attribution: "AI-generated with ElevenLabs (prompt by Gemini) — not a real recording",
    });
    return {
      url: saved.url,
      credit: "AI-generated (ElevenLabs, prompt by Gemini) — not a real recording",
    };
  } catch {
    // Best-effort — a missing sound just leaves the viewer's ambience fallback.
    return null;
  }
}
