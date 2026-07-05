// API base + a thin credentialed fetch helper. When VITE_API_URL is unset
// (local dev without a backend, or a Vercel preview), API_URL is null and the
// whole account/sync/analytics layer no-ops — the app runs on localStorage and
// the bundled dataset exactly as before.
export const API_URL = import.meta.env.VITE_API_URL || null;

// fetch against the API with cookies. Returns null on any failure or when no
// API is configured, so callers can treat the backend as best-effort.
export async function apiFetch(path, opts = {}) {
  if (!API_URL) return null;
  try {
    const res = await fetch(API_URL + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    return res;
  } catch {
    return null;
  }
}
