// Better Auth React client. Points at the API's /api/auth base. If no API is
// configured, we still create a client against a dummy base — every call is
// guarded by API_URL upstream (AuthContext), so it is never actually invoked.
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { API_URL } from "./apiBase.js";

export const authClient = createAuthClient({
  baseURL: (API_URL || "http://localhost") + "/api/auth",
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
