// BioTime connector — biodiversity time-series context (assemblage change over
// time), a scrape-only directory source reached via the Firecrawl MCP tier.
// Grounding text only. No-op unless a Firecrawl MCP server is configured.
import { callTool, mcpConfigured, mcpText } from "../mcp/client.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

export async function fetchBioTime(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  if (!mcpConfigured("firecrawl")) {
    return { provider: "biotime", ok: false, fields: {}, raw: null, error: "no MCP (skipped)" };
  }
  const term = q.scientific || q.name;
  if (!term) return { provider: "biotime", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const res = await callTool("firecrawl", "firecrawl_search", {
      query: `${term} population time series site:biotime.st-andrews.ac.uk`,
      limit: 1,
      scrapeOptions: { formats: ["markdown"] },
    });
    const text = mcpText(res);
    if (!text) return { provider: "biotime", ok: false, fields: {}, raw: res, error: "no content" };
    return {
      provider: "biotime",
      ok: true,
      fields: {},
      raw: { source: "BioTime", text: text.slice(0, 6_000) },
      sourceUrl: "https://biotime.st-andrews.ac.uk/",
    };
  } catch (e) {
    return { provider: "biotime", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
