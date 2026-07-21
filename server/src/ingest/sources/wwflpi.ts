// WWF Living Planet Index connector — population-trend context (multi-decade
// vertebrate decline), one of the directory's scrape-only sources reached via the
// Firecrawl MCP tier. Grounding text only (no structured fields). No-op unless a
// Firecrawl MCP server is configured.
import { callTool, mcpConfigured, mcpText } from "../mcp/client.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

export async function fetchWwfLpi(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  if (!mcpConfigured("firecrawl")) {
    return { provider: "wwflpi", ok: false, fields: {}, raw: null, error: "no MCP (skipped)" };
  }
  const term = q.scientific || q.name;
  if (!term) return { provider: "wwflpi", ok: false, fields: {}, raw: null, error: "no name" };
  try {
    const res = await callTool("firecrawl", "firecrawl_search", {
      query: `${term} population trend site:livingplanetindex.org OR site:livingplanet.panda.org`,
      limit: 1,
      scrapeOptions: { formats: ["markdown"] },
    });
    const text = mcpText(res);
    if (!text) return { provider: "wwflpi", ok: false, fields: {}, raw: res, error: "no content" };
    return {
      provider: "wwflpi",
      ok: true,
      fields: {},
      raw: { source: "WWF Living Planet Index", text: text.slice(0, 6_000) },
      sourceUrl: "https://www.livingplanetindex.org/",
    };
  } catch (e) {
    return { provider: "wwflpi", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
