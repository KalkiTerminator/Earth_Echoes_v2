// Applies pending Drizzle migrations. Run at server boot and in CI/deploy.
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, pool } from "./client.js";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "drizzle");

export async function runMigrations() {
  await migrate(db, { migrationsFolder });
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
