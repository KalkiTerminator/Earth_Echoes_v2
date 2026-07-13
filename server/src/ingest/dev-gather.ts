// Dev harness: resolve + reconcile a species from the live open APIs, with no
// LLM and no DB writes — proves the Phase-1 connector/resolver pipeline.
//
//   cd server
//   npx tsx src/ingest/dev-gather.ts "Vaquita"
//   npx tsx src/ingest/dev-gather.ts --scientific "Phocoena sinus"
import { gather } from "./resolvers/index.js";
import { pool } from "../db/client.js";

async function main() {
  const args = process.argv.slice(2);
  const sciIdx = args.indexOf("--scientific");
  const query = sciIdx >= 0
    ? { scientific: args[sciIdx + 1] }
    : { name: args.join(" ") || "Vaquita" };

  console.log("Resolving:", query);
  const res = await gather(query);
  console.log("\nCanonical scientific:", res.scientific, "| GBIF key:", res.gbifKey, "\n");

  for (const b of res.bundles) {
    console.log(`── ${b.domain} ──`);
    for (const f of b.fields) {
      const vals = f.candidates
        .map((c) => `${c.provider}=${JSON.stringify(c.value)}`)
        .join("  ");
      console.log(`  ${String(f.field)}${f.conflict ? " ⚠conflict" : ""}: ${vals}`);
    }
    if (b.notes.length) console.log("  notes:", b.notes.join("; "));
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
