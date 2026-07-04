// One-time: downloads each species photo into public/images/species/<id>.jpg
// so the app self-hosts its imagery.
//   node scripts/fetch-images.mjs
// Then commit public/images/. Until then the app falls back to the remote
// image automatically at runtime.
//
// Tries several sources per species (wsrv.nl CDN first — the same URL the
// app uses in browsers — then direct Wikimedia variants), because Wikimedia
// sometimes rejects non-browser clients.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPECIES } from "../src/data/species.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public/images/species");
mkdirSync(dest, { recursive: true });

const HEADERS = {
  // Browser-like UA with contact info per Wikimedia's user-agent policy
  "User-Agent": "Mozilla/5.0 (compatible; EarthsEchoesMirror/1.0; +https://github.com/KalkiTerminator/Earth_Echoes_v2)",
  "Accept": "image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5",
};

function candidates(remote) {
  const list = [remote]; // wsrv.nl proxy URL, known to work in browsers
  const m = remote.match(/[?&]url=(.+)$/);
  if (m) {
    list.push("https://" + m[1]);                    // direct, as stored (encoded)
    try { list.push("https://" + decodeURIComponent(m[1])); } catch (e) {}
  }
  return [...new Set(list)];
}

async function download(url) {
  const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`suspiciously small (${buf.length}B)`);
  return buf;
}

let ok = 0, failed = 0;
for (const s of SPECIES) {
  const out = join(dest, `${s.id}.jpg`);
  if (existsSync(out)) { console.log(`skip   ${s.id} (exists)`); ok++; continue; }
  const urls = candidates(s.imageRemote || "");
  let saved = false;
  const errors = [];
  for (const url of urls) {
    try {
      const buf = await download(url);
      writeFileSync(out, buf);
      console.log(`saved  ${s.id} (${(buf.length / 1024).toFixed(0)} KB) via ${new URL(url).host}`);
      saved = true;
      break;
    } catch (e) {
      errors.push(`${new URL(url).host}: ${e.message}`);
    }
  }
  if (saved) ok++;
  else { failed++; console.error(`FAILED ${s.id} — ${errors.join(" | ")}`); }
  await new Promise((r) => setTimeout(r, 300)); // be polite to the CDNs
}
console.log(`\n${ok}/${SPECIES.length} images ready in public/images/species${failed ? ` — ${failed} failed (app will use remote fallback)` : ""}`);
process.exit(failed ? 1 : 0);
