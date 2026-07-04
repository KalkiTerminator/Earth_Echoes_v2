// Copies globe textures from the three-globe package into public/textures
// so the app has zero runtime CDN dependencies.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/three-globe/example/img");
const dest = join(root, "public/textures");

const FILES = ["earth-blue-marble.jpg", "earth-dark.jpg", "earth-night.jpg", "earth-topology.png"];

mkdirSync(dest, { recursive: true });
for (const f of FILES) {
  const from = join(src, f);
  if (!existsSync(from)) {
    console.error(`copy-textures: missing ${from} — run npm install first`);
    process.exit(1);
  }
  copyFileSync(from, join(dest, f));
}
console.log(`copy-textures: ${FILES.length} textures ready in public/textures`);
