// Admin media upload. Multipart; type is verified by magic bytes (not the
// client mime/extension), capped at 10 MB, stored under a random filename.
import { Hono } from "hono";
import { db } from "../../db/client.js";
import { media } from "../../db/schema.js";
import { save } from "../../lib/storage.js";
import type { Variables } from "../../types.js";

export const adminUploads = new Hono<{ Variables: Variables }>();

const MAX_BYTES = 10 * 1024 * 1024;

adminUploads.post("/uploads", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return c.json({ error: "no file" }, 400);
  if (file.size > MAX_BYTES) return c.json({ error: "file too large (max 10MB)" }, 413);

  const buf = Buffer.from(await file.arrayBuffer());
  let saved;
  try {
    saved = await save(buf);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }

  await db.insert(media).values({
    id: saved.id,
    kind: saved.kind,
    originalName: file.name.slice(0, 200),
    mime: saved.mime,
    sizeBytes: saved.size,
    url: saved.url,
    createdBy: c.get("user")!.id,
  });

  return c.json({ url: saved.url, kind: saved.kind, id: saved.id }, 201);
});
