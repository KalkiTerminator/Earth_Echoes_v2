// Entry point: run migrations, warm the snapshot cache, schedule the rollup
// job, and start the HTTP server. Graceful shutdown drains the pool.
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { runMigrations } from "./db/migrate.js";
import { getSnapshot } from "./lib/snapshot.js";
import { scheduleRollup } from "./jobs/rollup.js";
import { promoteAdmins } from "./lib/adminBootstrap.js";
import { pool } from "./db/client.js";

async function main() {
  await runMigrations();
  await promoteAdmins();
  await getSnapshot(); // warm cache (may be null until first publish/seed)
  scheduleRollup();

  const app = createApp();
  const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
    console.log(`Earth's Echoes API on :${info.port} (${env.isProd ? "prod" : "dev"})`);
  });

  const shutdown = () => {
    server.close();
    pool.end().finally(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((e) => {
  console.error("fatal boot error", e);
  process.exit(1);
});
