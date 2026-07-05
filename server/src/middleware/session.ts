// Resolves the Better Auth session from the request cookies and stashes the
// user/session on the Hono context for downstream guards and routes.
import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";
import type { Variables } from "../types.js";

export const sessionResolver = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  try {
    const data = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set("user", data?.user ?? null);
    c.set("session", data?.session ?? null);
  } catch {
    c.set("user", null);
    c.set("session", null);
  }
  await next();
});
