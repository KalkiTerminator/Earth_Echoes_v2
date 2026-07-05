// Serves uploaded media from the volume with immutable caching. Filenames are
// random (nanoid) so long-lived caching is safe; nosniff blocks type confusion.
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolveFile, fileExists } from "../lib/storage.js";

export const fileRoutes = new Hono();

const MIME: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp",
  mp3: "audio/mpeg", ogg: "audio/ogg",
};

fileRoutes.get("/:name", async (c) => {
  const name = c.req.param("name");
  const full = resolveFile(name);
  if (!full || !(await fileExists(full))) return c.notFound();

  const ext = name.split(".").pop()!.toLowerCase();
  const buf = await readFile(full);
  c.header("Content-Type", MIME[ext] || "application/octet-stream");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Access-Control-Allow-Origin", "*");
  return c.body(buf);
});
