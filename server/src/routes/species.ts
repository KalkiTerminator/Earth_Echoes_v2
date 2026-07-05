// Public read endpoint — the hot path. Serves the cached snapshot with an
// ETag so repeat loads (atlas.js fetches with cache:"no-cache") become cheap
// 304s, and Cache-Control that a CDN can honor.
import { Hono } from "hono";
import { getSnapshot } from "../lib/snapshot.js";

export const speciesRoutes = new Hono();

speciesRoutes.get("/", async (c) => {
  const snap = await getSnapshot();
  if (!snap) return c.json({ error: "no snapshot" }, 503);

  c.header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
  c.header("ETag", snap.etag);
  c.header("Access-Control-Allow-Origin", "*"); // cookie-free read

  if (c.req.header("if-none-match") === snap.etag) {
    return c.body(null, 304);
  }
  return c.json(snap.doc);
});
