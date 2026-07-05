// Media storage abstraction. Today: local filesystem (a Railway volume in
// prod, mounted at STORAGE_DIR). The save()/exists() interface is the only
// surface that changes when swapping to Cloudflare R2 later — nothing else
// in the app touches disk paths.
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { nanoid } from "nanoid";
import { env } from "../env.js";

const ROOT = resolve(env.storageDir);

// Magic-byte sniffing — never trust the client-supplied extension/mime.
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/webp", ext: "webp", test: (b) => b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP" },
  { mime: "audio/mpeg", ext: "mp3", test: (b) => b.slice(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/ogg", ext: "ogg", test: (b) => b.slice(0, 4).toString("ascii") === "OggS" },
];

export function sniff(buf: Buffer): { mime: string; ext: string; kind: "image" | "audio" } | null {
  for (const s of SIGNATURES) {
    if (s.test(buf)) {
      return { mime: s.mime, ext: s.ext, kind: s.mime.startsWith("image/") ? "image" : "audio" };
    }
  }
  return null;
}

export interface SavedMedia {
  id: string;
  filename: string;
  url: string;
  mime: string;
  kind: "image" | "audio";
  size: number;
}

// Persist a validated buffer under a random filename. Returns the public URL
// the API will serve it at (/files/<name>) — absolute, so withBase() passes
// it through untouched on the frontend.
export async function save(buf: Buffer): Promise<SavedMedia> {
  const sig = sniff(buf);
  if (!sig) throw new Error("unsupported or unrecognized file type");
  const id = nanoid();
  const filename = `${id}.${sig.ext}`;
  await mkdir(ROOT, { recursive: true });
  await writeFile(join(ROOT, filename), buf);
  return {
    id,
    filename,
    url: `${env.authUrl}/files/${filename}`,
    mime: sig.mime,
    kind: sig.kind,
    size: buf.length,
  };
}

// Resolve a request path to an on-disk file, refusing traversal.
export function resolveFile(name: string): string | null {
  if (!/^[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(name)) return null;
  const full = join(ROOT, name);
  if (!full.startsWith(ROOT)) return null;
  return full;
}

export async function fileExists(full: string): Promise<boolean> {
  try {
    await stat(full);
    return true;
  } catch {
    return false;
  }
}
