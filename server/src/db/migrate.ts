// Applies pending Drizzle migrations. Run at server boot and in CI/deploy.
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, pool } from "./client.js";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "drizzle");

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Apply pending migrations, retrying on transient connection failures.
 *
 * On Railway the database is reached over the project's private network, whose
 * DNS/routing can take a few seconds to come up after the container starts. A
 * first connect during that window fails with ETIMEDOUT/ECONNREFUSED and would
 * otherwise crash the whole boot. Back off and retry so the API survives a cold
 * start; only a persistent failure is fatal.
 */
export async function runMigrations(retries = 6) {
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate(db, { migrationsFolder });
      return;
    } catch (e) {
      const code = (e as { cause?: { code?: string }; code?: string })?.cause?.code
        ?? (e as { code?: string })?.code;
      const transient =
        code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENOTFOUND" ||
        code === "EAI_AGAIN" || code === "ECONNRESET";
      if (!transient || attempt > retries) throw e;
      const wait = Math.min(15_000, 2 ** attempt * 500); // 1s, 2s, 4s, 8s, 15s...
      console.warn(
        `db not reachable (${code}); retry ${attempt}/${retries} in ${wait}ms`,
      );
      await sleep(wait);
    }
  }
}

// Allow `tsx src/db/migrate.ts` as a standalone step.
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("migrations applied");
      return pool.end();
    })
    .catch((e) => {
      console.error("migration failed", e);
      process.exit(1);
    });
}
