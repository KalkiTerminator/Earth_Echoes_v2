// One-time: downloads each species photo from Wikimedia into
// public/images/species/<id>.jpg so the app self-hosts its imagery.
// Run locally (needs internet access to upload.wikimedia.org):
//   node scripts/fetch-images.mjs
// Then commit public/images/. Until then the app falls back to the
// remote image automatically at runtime.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPECIES } from "../src/data/species.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public/images/species");
mkdirSync(dest, { recursive: true });

// The dataset stores the wsrv.nl proxy URL; download straight from Wikimedia.
function directUrl(remote) {
  const m = remote.match(/[?&]url=(.+)$/);
  return m ? "https://" + decodeURIComponent(m[1]) : remote;
}

let ok = 0, failed = 0;
for (const s of SPECIES) {
  const out = join(dest, `${s.id}.jpg`);
  if (existsSync(out)) { console.log(`skip   ${s.id} (exists)`); ok++; continue; }
  const url = directUrl(s.imageRemote || "");
  try {
    const res = await fetch(url, { headers: { "User-Agent": "EarthsEchoes/1.0 (species image mirror)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) throw new Error(`suspiciously small (${buf.length}B)`);
    writeFileSync(out, buf);
    console.log(`saved  ${s.id} (${(buf.length / 1024).toFixed(0)} KB)`);
    ok++;
  } catch (e) {
    console.error(`FAILED ${s.id}: ${e.message} — ${url}`);
    failed++;
  }
}
console.log(`\n${ok}/${SPECIES.length} images ready in public/images/species${failed ? ` — ${failed} failed (app will use remote fallback)` : ""}`);
process.exit(failed ? 1 : 0);
