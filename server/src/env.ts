// Centralized environment config. Fails fast in production if required
// secrets are missing; permissive defaults keep local dev frictionless.
const isProd = process.env.NODE_ENV === "production";

function required(name: string, devDefault?: string): string {
  const v = process.env[name] ?? (isProd ? undefined : devDefault);
  if (v === undefined) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

export const env = {
  isProd,
  port: parseInt(process.env.PORT || "8787", 10),
  databaseUrl: required("DATABASE_URL", "postgres://postgres@localhost:55432/earths_echoes"),
  authSecret: required("BETTER_AUTH_SECRET", "dev-insecure-secret-change-me-0123456789abcd"),
  // Where the API itself is reachable (used by Better Auth for callback URLs).
  authUrl: process.env.BETTER_AUTH_URL || "http://localhost:8787",
  // The single browser origin allowed to send credentialed requests.
  appOrigin: process.env.APP_ORIGIN || "http://localhost:5173",
  // Leading-dot domain for cross-subdomain cookies (app + api). Empty locally.
  cookieDomain: process.env.COOKIE_DOMAIN || "",
  // Comma-separated emails auto-promoted to admin on first sign-in.
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // Directory for uploaded media (Railway volume mount in prod).
  storageDir: process.env.STORAGE_DIR || "./.storage",
  // Optional Google OAuth (Phase 2b).
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
};
