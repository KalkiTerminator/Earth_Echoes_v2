// Postgres connection pool + Drizzle instance. Pool is capped so a single
// stateless API instance stays well under Postgres connection limits.
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import { env } from "../env.js";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  // Fail a stuck connect attempt fast so the boot retry loop can back off,
  // rather than hanging on Railway's private DNS before it's ready.
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  // Railway Postgres requires TLS; local dev does not.
  ssl: env.isProd ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export { schema };
