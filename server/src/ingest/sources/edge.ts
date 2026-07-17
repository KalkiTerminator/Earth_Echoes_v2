// EDGE of Existence connector — enrichment grounding for *why a species is
// irreplaceable* (Evolutionarily Distinct & Globally Endangered). EDGE has no
// clean public API, so we reach it agentically through the Firecrawl MCP tier:
// a scoped search returns the species' EDGE page as markdown, retained as raw
// grounding text for the synthesizer/validator. Contributes no structured
// fields. No-op unless a Firecrawl MCP server is configured.
import { callTool, mcpConfigured, mcpText } from "../mcp/client.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

export async function fetchEdge(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  if (!mcpConfigured("firecrawl")) {
    return { provider: "edge", ok: false, fields: {}, raw: null, error: "no MCP (skipped)" };
  }
  const term = q.scientific || q.name;
  if (!term) return { provider: "edge", ok: false, fields: {}, raw: null, error: "no name" };

  try {
    // Firecrawl's search tool, scoped to the EDGE site, returns the most
    // relevant page's content. Tool/arg names follow the Firecrawl MCP server.
    const res = await callTool("firecrawl", "firecrawl_search", {
      query: `${term} site:edgeofexistence.org`,
      limit: 1,
      scrapeOptions: { formats: ["markdown"] },
    });
    const text = mcpText(res);
    if (!text) return { provider: "edge", ok: false, fields: {}, raw: res, error: "no content" };
    return {
      provider: "edge",
      ok: true,
      fields: {},
      raw: { source: "EDGE of Existence", text: text.slice(0, 8_000) },
      sourceUrl: "https://www.edgeofexistence.org/species/",
    };
  } catch (e) {
    return { provider: "edge", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
