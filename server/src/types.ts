// Shared Hono context variable types.
import type { auth } from "./auth.js";

type Session = typeof auth.$Infer.Session;

export type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};
