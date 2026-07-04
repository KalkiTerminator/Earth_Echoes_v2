// Generates public/data/species.json from the bundled dataset.
// This JSON is what the app fetches at runtime (see src/data/atlas.js);
// in Phase 2 a backend API will serve the same document shape and the
// frontend switches over via the VITE_DATA_URL env var.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPECIES, HABITATS, THREAT_CLASSES } from "../src/data/species.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public/data");
mkdirSync(dest, { recursive: true });

const doc = {
  version: 1,
  generatedAt: new Date().toISOString(),
  habitats: HABITATS,
  threatClasses: THREAT_CLASSES,
  species: SPECIES,
};

writeFileSync(join(dest, "species.json"), JSON.stringify(doc, null, 2));
console.log(`build-data: ${SPECIES.length} species written to public/data/species.json`);
