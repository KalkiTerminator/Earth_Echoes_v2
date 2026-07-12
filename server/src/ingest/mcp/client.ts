// MCP client for the scrape-only enrichment tier (Firecrawl / Apify — the owner
// has credits for both). Sources like EDGE of Existence or WWF LPI have no clean
// API, so we reach them agentically through an MCP server. Entirely optional:
// with no *_MCP_URL configured, every call is a no-op and the pipeline runs on
// the direct-HTTP connectors alone.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "../../env.js";

export type McpServer = "firecrawl" | "apify";

const clients: Partial<Record<McpServer, Client>> = {};

function urlFor(s: McpServer): string {
  return s === "firecrawl" ? env.ingest.firecrawlMcpUrl : env.ingest.apifyMcpUrl;
}
function keyFor(s: McpServer): string {
  return s === "firecrawl" ? env.ingest.firecrawlKey : env.ingest.apifyToken;
}

export function mcpConfigured(s: McpServer): boolean {
  return Boolean(urlFor(s));
}

async function getClient(s: McpServer): Promise<Client | null> {
  if (!urlFor(s)) return null;
  if (clients[s]) return clients[s]!;
  const key = keyFor(s);
  const transport = new StreamableHTTPClientTransport(new URL(urlFor(s)), {
    requestInit: key ? { headers: { Authorization: `Bearer ${key}` } } : undefined,
  });
  const client = new Client({ name: "earths-echoes-ingest", version: "1.0.0" });
  await client.connect(transport);
  clients[s] = client;
  return client;
}

/** Extract concatenated text parts from an MCP tool result. */
export function mcpText(result: unknown): string {
  const content = (result as { content?: { type?: string; text?: string }[] })?.content;
  if (!Array.isArray(content)) return "";
  return content.filter((c) => c.type === "text" && c.text).map((c) => c.text as string).join("\n");
}

/** Invoke a tool on an MCP server. Returns null when the server isn't configured. */
export async function callTool(s: McpServer, name: string, args: Record<string, unknown>): Promise<unknown> {
  const client = await getClient(s);
  if (!client) return null;
  return client.callTool({ name, arguments: args });
}

export async function listTools(s: McpServer): Promise<string[]> {
  const client = await getClient(s);
  if (!client) return [];
  const res = await client.listTools();
  return (res.tools || []).map((t) => t.name);
}

/** Close any open MCP connections (called on graceful shutdown). */
export async function closeMcp(): Promise<void> {
  for (const s of Object.keys(clients) as McpServer[]) {
    try { await clients[s]?.close(); } catch { /* ignore */ }
    delete clients[s];
  }
}
