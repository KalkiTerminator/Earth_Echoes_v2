// Promotes any existing users whose email is in ADMIN_EMAILS to the admin
// role. Runs once at boot so adding an email to the allowlist takes effect on
// the next deploy even for accounts created before it was listed.
import { inArray, and, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { user } from "../db/schema.js";
import { env } from "../env.js";

export async function promoteAdmins() {
  if (env.adminEmails.length === 0) return;
  const res = await db
    .update(user)
    .set({ role: "admin", updatedAt: new Date() })
    .where(and(inArray(user.email, env.adminEmails), ne(user.role, "admin")))
    .returning({ email: user.email });
  if (res.length) console.log(`admin bootstrap: promoted ${res.map((r) => r.email).join(", ")}`);
}
