// Firecrawl-MCP enrichment connector — scrapes a supplementary page (the
// species' Wikipedia article as full markdown) to give the synthesizer and
// validator extra grounding material beyond the structured APIs. Contributes no
// structured fields; its value is the retained raw text. No-op unless a
// Firecrawl MCP server is configured.
import { callTool, mcpConfigured, mcpText } from "../mcp/client.js";
import type { ConnectorResult, SpeciesQuery } from "../types.js";

export async function fetchScrape(q: SpeciesQuery): Promise<ConnectorResult<unknown>> {
  if (!mcpConfigured("firecrawl")) {
    return { provider: "firecrawl", ok: false, fields: {}, raw: null, error: "no MCP (skipped)" };
  }
  const term = q.scientific || q.name;
  if (!term) return { provider: "firecrawl", ok: false, fields: {}, raw: null, error: "no name" };

  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(term.replace(/ /g, "_"))}`;
  try {
    // Firecrawl's MCP scrape tool. Tool/arg names follow the Firecrawl MCP server.
    const res = await callTool("firecrawl", "firecrawl_scrape", { url, formats: ["markdown"] });
    const text = mcpText(res);
    if (!text) return { provider: "firecrawl", ok: false, fields: {}, raw: res, error: "no content" };
    return {
      provider: "firecrawl",
      ok: true,
      fields: {},
      raw: { url, text: text.slice(0, 12_000) },
      sourceUrl: url,
    };
  } catch (e) {
    return { provider: "firecrawl", ok: false, fields: {}, raw: null, error: String(e) };
  }
}
