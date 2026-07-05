// Auth context — wraps Better Auth's useSession and exposes a stable shape to
// the app. When no API is configured (VITE_API_URL unset), it reports a
// signed-out state and never calls the network, so the SPA works standalone.
import { createContext, useContext, useMemo } from "react";
import { API_URL } from "../lib/apiBase.js";
import { useSession, signIn, signUp, signOut } from "../lib/authClient.js";

const AuthContext = createContext({
  user: null, isAdmin: false, isPending: false, enabled: false,
  signIn: async () => {}, signUp: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }) {
  const enabled = !!API_URL;
  // useSession is a hook; when disabled we still call it (Better Auth returns
  // an inert result against the dummy base) but ignore the network entirely.
  const session = enabled ? useSession() : { data: null, isPending: false };
  const user = enabled ? session.data?.user ?? null : null;

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === "admin",
      isPending: enabled ? session.isPending : false,
      enabled,
      signIn: (email, password) =>
        signIn.email({ email, password }),
      signUp: (email, password, name) =>
        signUp.email({ email, password, name }),
      signOut: () => signOut(),
    }),
    [user, enabled, session?.isPending]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
