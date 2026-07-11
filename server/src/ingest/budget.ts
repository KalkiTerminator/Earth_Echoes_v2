// Cost metering + guardrails. Every paid call records into usage_meter; a run
// aborts before exceeding the per-run cap, and scheduling is disabled once the
// month's spend crosses the monthly ceiling (both configured in env.ingest).
import { gte, sql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { env } from "../env.js";
import type { ProviderId } from "./types.js";

export interface Usage {
  calls?: number;
  tokens?: number;
  costCents?: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function firstOfMonth(): string {
  return today().slice(0, 8) + "01";
}

/** Record usage for a provider against today's row (best-effort). */
export async function meter(provider: ProviderId, u: Usage): Promise<void> {
  const calls = u.calls ?? 0;
  const tokens = u.tokens ?? 0;
  const costCents = u.costCents ?? 0;
  try {
    await db
      .insert(schema.usageMeter)
      .values({ day: today(), provider, calls, tokens, costCents: String(costCents) })
      .onConflictDoUpdate({
        target: [schema.usageMeter.day, schema.usageMeter.provider],
        set: {
          calls: sql`${schema.usageMeter.calls} + ${calls}`,
          tokens: sql`${schema.usageMeter.tokens} + ${tokens}`,
          costCents: sql`${schema.usageMeter.costCents} + ${costCents}`,
        },
      });
  } catch {
    // Metering must never break a run.
  }
}

/** Total spend (US cents) so far this calendar month. */
export async function monthlySpendCents(): Promise<number> {
  try {
    const rows = await db
      .select({ total: sql<string>`coalesce(sum(${schema.usageMeter.costCents}), 0)` })
      .from(schema.usageMeter)
      .where(gte(schema.usageMeter.day, firstOfMonth()));
    return Math.round(Number(rows[0]?.total ?? 0));
  } catch {
    return 0;
  }
}

/** True when there is monthly budget headroom to start another run. */
export async function hasMonthlyHeadroom(): Promise<boolean> {
  return (await monthlySpendCents()) < env.ingest.monthlyCents;
}

/** Tracks spend within a single run against the per-run ceiling. */
export class RunBudget {
  private spentCents = 0;
  constructor(private readonly capCents = env.ingest.perRunCents) {}

  get spent(): number {
    return this.spentCents;
  }

  /** Record spend; throws if this run has blown its per-run cap. */
  charge(costCents: number): void {
    this.spentCents += costCents;
    if (this.spentCents > this.capCents) {
      throw new Error(
        `Run budget exceeded: ${this.spentCents}¢ > ${this.capCents}¢ cap`,
      );
    }
  }

  wouldExceed(costCents: number): boolean {
    return this.spentCents + costCents > this.capCents;
  }
}
