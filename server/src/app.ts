// Hono application assembly + middleware chain. Order matters:
// secureHeaders → CORS → rate limits → session resolver → routes.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { auth } from "./auth.js";
import { env } from "./env.js";
import { getSnapshot } from "./lib/snapshot.js";
import { sessionResolver } from "./middleware/session.js";
import { requireAuth, requireAdmin, requireSameOrigin } from "./middleware/guards.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { speciesRoutes } from "./routes/species.js";
import { eventsRoutes } from "./routes/events.js";
import { fileRoutes } from "./routes/files.js";
import { meRoutes } from "./routes/me.js";
import { adminContent } from "./routes/admin/content.js";
import { adminUploads } from "./routes/admin/uploads.js";
import { adminAnalytics } from "./routes/admin/analytics.js";
import { adminAgents } from "./routes/admin/agents.js";
import type { Variables } from "./types.js";

export function createApp() {
  const app = new Hono<{ Variables: Variables }>();

  app.use("*", secureHeaders());

  // Credentialed CORS is restricted to the app origin. The cookie-free public
  // reads (/api/species, /files/*) set their own permissive ACAO header.
  app.use("*", cors({
    origin: env.appOrigin,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }));

  // Global + targeted rate limits.
  app.use("*", rateLimit({ name: "global", limit: 300, windowMs: 60_000 }));
  app.use("/api/auth/*", rateLimit({ name: "auth", limit: 20, windowMs: 60_000 }));
  app.use("/api/events", rateLimit({ name: "events", limit: 60, windowMs: 60_000 }));

  // Resolve session for every request (routes/guards read it off context).
  app.use("*", sessionResolver);

  // Liveness.
  app.get("/health", async (c) => {
    const snap = await getSnapshot();
    return c.json({ ok: true, snapshot: snap?.version ?? null });
  });

  // Better Auth handles all of /api/auth/*.
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  // Public.
  app.route("/api/species", speciesRoutes);
  app.route("/api/events", eventsRoutes);
  app.route("/files", fileRoutes);

  // Authenticated user sync (same-origin + session).
  app.use("/api/me/*", requireSameOrigin, requireAuth);
  app.route("/api/me", meRoutes);

  // Admin (same-origin + admin role).
  app.use("/api/admin/*", requireSameOrigin, requireAdmin);
  app.route("/api/admin", adminContent);
  app.route("/api/admin", adminUploads);
  app.route("/api/admin/analytics", adminAnalytics);
  app.route("/api/admin", adminAgents);

  return app;
}
