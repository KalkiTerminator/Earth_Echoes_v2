// Apify connector — runs a configured Apify actor (via the Apify MCP server) for
// supplementary enrichment the direct APIs miss (e.g. a web-content or search
// actor). The actor/tool name varies per account, so it is configured through
// APIFY_ACTOR; grounding text only. No-op unless both an Apify MCP server and an
// actor are configured.
import { callTool, mcpConfigured, mcpText } from "../mcp/client.js";
import { env } from "../../env.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

export async function fetchApify(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  const actor = env.ingest.apifyActor;
  if (!mcpConfigured("apify") || !actor) {
    return { provider: "apify", ok: false, fields: {}, raw: null, error: "no MCP/actor (skipped)" };
  }
  const term = q.scientific || q.name;
  if (!term) return { provider: "apify", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    // Actor arg shape varies; `query` is the common convention for search/content
    // actors. Override the actor via APIFY_ACTOR to match your account's tool.
    const res = await callTool("apify", actor, { query: `${term} species conservation`, maxResults: 1 });
    const text = mcpText(res);
    if (!text) return { provider: "apify", ok: false, fields: {}, raw: res, error: "no content" };
    return {
      provider: "apify",
      ok: true,
      fields: {},
      raw: { source: `Apify (${actor})`, text: text.slice(0, 6_000) },
      sourceUrl: "https://apify.com/",
    };
  } catch (e) {
    return { provider: "apify", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
