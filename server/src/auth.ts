// Better Auth configuration — email+password now, Google OAuth ready to
// enable. Sessions live in Postgres via the Drizzle adapter. Cross-subdomain
// cookies let earthsechoes.com and api.earthsechoes.com share a session.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db, schema } from "./db/client.js";
import { env } from "./env.js";

export const auth = betterAuth({
  secret: env.authSecret,
  baseURL: env.authUrl,
  basePath: "/api/auth",
  trustedOrigins: env.appOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Email verification can be layered on later; sign-up is usable now.
    requireEmailVerification: false,
  },
  socialProviders: env.googleClientId
    ? {
        google: {
          clientId: env.googleClientId,
          clientSecret: env.googleClientSecret,
        },
      }
    : undefined,
  plugins: [admin()],
  databaseHooks: {
    user: {
      create: {
        // Auto-promote allowlisted emails to admin at account creation.
        before: async (user) => {
          if (env.adminEmails.includes(user.email.toLowerCase())) {
            return { data: { ...user, role: "admin" } };
          }
          return { data: user };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    useSecureCookies: env.isProd,
    crossSubDomainCookies: env.cookieDomain
      ? { enabled: true, domain: env.cookieDomain }
      : undefined,
  },
});

export type AuthSession = typeof auth.$Infer.Session;
