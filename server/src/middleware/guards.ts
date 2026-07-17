// Auth guards + a defense-in-depth Origin check for cookie-authenticated
// writes (SameSite=Lax already blocks cross-site form posts; this rejects
// anything whose Origin isn't our app before it can mutate state).
import { createMiddleware } from "hono/factory";
import type { Variables } from "../types.js";
import { env } from "../env.js";

export const requireAuth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  if (!c.get("user")) return c.json({ error: "unauthorized" }, 401);
  await next();
});

export const requireAdmin = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if ((user as any).role !== "admin") return c.json({ error: "forbidden" }, 403);
  await next();
});

// Reject state-changing requests whose Origin header isn't the trusted app.
export const requireSameOrigin = createMiddleware(async (c, next) => {
  const origin = c.req.header("origin");
  if (origin && !env.appOrigins.includes(origin)) {
    return c.json({ error: "bad origin" }, 403);
  }
  await next();
});
