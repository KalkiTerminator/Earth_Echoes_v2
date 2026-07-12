// Centralized environment config. Fails fast in production if required
// secrets are missing; permissive defaults keep local dev frictionless.
const isProd = process.env.NODE_ENV === "production";

function required(name: string, devDefault?: string): string {
  const v = process.env[name] ?? (isProd ? undefined : devDefault);
  if (v === undefined) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

export const env = {
  isProd,
  port: parseInt(process.env.PORT || "8787", 10),
  databaseUrl: required("DATABASE_URL", "postgres://postgres@localhost:55432/earths_echoes"),
  authSecret: required("BETTER_AUTH_SECRET", "dev-insecure-secret-change-me-0123456789abcd"),
  // Where the API itself is reachable (used by Better Auth for callback URLs).
  authUrl: process.env.BETTER_AUTH_URL || "http://localhost:8787",
  // The single browser origin allowed to send credentialed requests.
  appOrigin: process.env.APP_ORIGIN || "http://localhost:5173",
  // Leading-dot domain for cross-subdomain cookies (app + api). Empty locally.
  cookieDomain: process.env.COOKIE_DOMAIN || "",
  // Comma-separated emails auto-promoted to admin on first sign-in.
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // Directory for uploaded media (Railway volume mount in prod).
  storageDir: process.env.STORAGE_DIR || "./.storage",
  // Optional Google OAuth (Phase 2b).
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",

  // ---- Autonomous ingestion (Phase 2+). All optional: absent config simply
  // disables the connectors/LLMs that need it; the app still boots. Secrets are
  // server-only and never shipped to the browser. ----
  ingest: {
    // Contact string required in User-Agent by Wikimedia/Wikidata etc.
    contactEmail: process.env.INGEST_CONTACT_EMAIL || "earths-echoes@example.org",

    // ---- LLMs: everything runs on Google Vertex AI (one cloud, one credit
    // pool). Vertex serves both Gemini and Anthropic Claude. ----
    vertexProject: process.env.GOOGLE_VERTEX_PROJECT || "",
    vertexLocation: process.env.GOOGLE_VERTEX_LOCATION || "us-central1",
    // Anthropic-on-Vertex is region-gated; if unset, falls back to vertexLocation.
    vertexAnthropicLocation: process.env.GOOGLE_VERTEX_ANTHROPIC_LOCATION || "",
    // Service-account JSON (stringified). Also honors GOOGLE_APPLICATION_CREDENTIALS.
    googleCredentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "",
    // Model IDs (override to the exact ids your Vertex project exposes).
    synthModel: process.env.INGEST_SYNTH_MODEL || "claude-haiku-4-5",       // Anthropic on Vertex
    validateModel: process.env.INGEST_VALIDATE_MODEL || "gemini-2.5-flash", // Gemini (thinking)
    mediaModel: process.env.INGEST_MEDIA_MODEL || "gemini-2.5-flash",       // Gemini multimodal

    // Source tokens for the direct-HTTP connectors (free-but-registered).
    iucnToken: process.env.IUCN_TOKEN || "",
    ebirdToken: process.env.EBIRD_TOKEN || "",
    flickrKey: process.env.FLICKR_API_KEY || "",
    unsplashKey: process.env.UNSPLASH_ACCESS_KEY || "",
    ncbiKey: process.env.NCBI_API_KEY || "",
    natureserveToken: process.env.NATURESERVE_TOKEN || "",

    // Scrape-only enrichment via MCP (owner has Apify + Firecrawl credits).
    firecrawlMcpUrl: process.env.FIRECRAWL_MCP_URL || "",
    firecrawlKey: process.env.FIRECRAWL_API_KEY || "",
    apifyMcpUrl: process.env.APIFY_MCP_URL || "",
    apifyToken: process.env.APIFY_TOKEN || "",

    // Cost guardrails (US cents). A run aborts if it would exceed perRunCents;
    // scheduling is disabled once the month's spend crosses monthlyCents.
    perRunCents: parseInt(process.env.INGEST_PER_RUN_CENTS || "100", 10),
    monthlyCents: parseInt(process.env.INGEST_MONTHLY_CENTS || "2000", 10),
  },
};
