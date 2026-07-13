// Append-only audit trail helper. Every governed action (run start/finish,
// candidate promote/reject, rollback) records here for the Command Center's
// audit log. Best-effort: auditing must never break the action it records.
import { db, schema } from "../db/client.js";

export interface AuditEntry {
  actor: string; // user id, 'agent', or 'system'
  action: string; // e.g. 'run.start', 'candidate.promote'
  entity?: string;
  entityId?: string;
  runId?: string;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}

export async function audit(e: AuditEntry): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      actor: e.actor,
      action: e.action,
      entity: e.entity ?? null,
      entityId: e.entityId ?? null,
      runId: e.runId ?? null,
      before: e.before ?? null,
      after: e.after ?? null,
      meta: e.meta ?? {},
    });
  } catch {
    // swallow — never let auditing fail the underlying operation
  }
}
